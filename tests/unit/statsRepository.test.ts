import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateStats, getStats } from "../../src/lib/server/statsRepository";
import { docClient } from "../../src/lib/server/db";

// Mock the db module
vi.mock("../../src/lib/server/db", () => {
  return {
    docClient: {
      send: vi.fn(),
    },
    TABLES: {
      leaderboard: "mock-table",
    },
  };
});

describe("statsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateStats", () => {
    it("calls docClient.send three times (once for initialization, once for counters, once for fastest model conditionally)", async () => {
      // Setup successful resolves
      vi.mocked(docClient.send).mockResolvedValue({} as never);

      await updateStats(150, "groq", "llama-3-8b", "EU-West");

      expect(docClient.send).toHaveBeenCalledTimes(3);

      // Verify the first command is PutCommand for initialization
      const firstCallArgs = vi.mocked(docClient.send).mock.calls[0][0];
      const firstCallInput = firstCallArgs.input as { TableName: string; Item?: { id: string }; ConditionExpression?: string };
      expect(firstCallInput.TableName).toBe("mock-table");
      expect(firstCallInput.Item?.id).toBe("STATS#GLOBAL");
      expect(firstCallInput.ConditionExpression).toContain("attribute_not_exists");

      // Verify the second command is UpdateCommand for counters
      const secondCallArgs = vi.mocked(docClient.send).mock.calls[1][0];
      const secondCallInput = secondCallArgs.input as { Key?: { id: string }; UpdateExpression?: string };
      expect(secondCallInput.Key?.id).toBe("STATS#GLOBAL");
      expect(secondCallInput.UpdateExpression).toContain("ADD totalSubmissions");

      // Verify the third command is UpdateCommand for conditional fastest update
      const thirdCallArgs = vi.mocked(docClient.send).mock.calls[2][0];
      const thirdCallInput = thirdCallArgs.input as { UpdateExpression?: string; ConditionExpression?: string };
      expect(thirdCallInput.UpdateExpression).toContain("SET fastestTps = :tps");
      expect(thirdCallInput.ConditionExpression).toContain("fastestTps");
    });

    it("ignores ConditionalCheckFailedException errors for fastest score check", async () => {
      // Mock initialization succeeding
      vi.mocked(docClient.send).mockResolvedValueOnce({} as never);
      // Mock counters update succeeding
      vi.mocked(docClient.send).mockResolvedValueOnce({} as never);
      // Mock fastest update failing with ConditionalCheckFailedException
      const error = new Error("Conditional check failed");
      error.name = "ConditionalCheckFailedException";
      vi.mocked(docClient.send).mockRejectedValueOnce(error);

      // Should not throw
      await expect(updateStats(50, "openai", "gpt-4o", "Americas-E")).resolves.not.toThrow();
    });

    it("throws any other database errors during updates", async () => {
      // Mock initialization succeeding
      vi.mocked(docClient.send).mockResolvedValueOnce({} as never);
      // Mock counters update succeeding
      vi.mocked(docClient.send).mockResolvedValueOnce({} as never);
      // Mock fastest update failing with access denied error
      const error = new Error("AccessDeniedException");
      error.name = "AccessDeniedException";
      vi.mocked(docClient.send).mockRejectedValueOnce(error);

      await expect(updateStats(50, "openai", "gpt-4o", "Americas-E")).rejects.toThrow("AccessDeniedException");
    });
  });

  describe("getStats", () => {
    it("returns parsed stats when the stats item exists", async () => {
      const mockDbItem = {
        Item: {
          totalSubmissions: 10,
          totalTpsCumulative: 1500,
          fastestTps: 450,
          fastestModel: "llama-3-70b",
          fastestProvider: "groq",
          providerCounts: { groq: 10 },
          regionCounts: { "EU-West": 10 },
        },
      };
      vi.mocked(docClient.send).mockResolvedValueOnce(mockDbItem as never);

      const stats = await getStats();

      expect(docClient.send).toHaveBeenCalledTimes(1);
      expect(stats).toEqual({
        totalSubmissions: 10,
        totalTpsCumulative: 1500,
        fastestTps: 450,
        fastestModel: "llama-3-70b",
        fastestProvider: "groq",
        providerCounts: { groq: 10 },
        regionCounts: { "EU-West": 10 },
      });
    });

    it("returns null when the stats item does not exist", async () => {
      vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined } as never);

      const stats = await getStats();

      expect(stats).toBeNull();
    });
  });
});
