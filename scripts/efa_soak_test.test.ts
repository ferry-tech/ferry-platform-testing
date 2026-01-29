// ============================================
// k6 TypeScript Load Test — efa_soak_test
// Executes 102 webhook iterations over ~1 hour
// ============================================

import http from "k6/http";
import type { RefinedResponse, ResponseType } from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

/**
 * -------------------------------------------------
 * Types
 * -------------------------------------------------
 */
interface PaydayRecord {
  financialAccountId: string;
}

interface Headers {
  [key: string]: string;
}

/**
 * -------------------------------------------------
 * Load & shuffle JSON data ONCE
 * -------------------------------------------------
 */
const testData = new SharedArray<PaydayRecord>("payday-data", () => {
  const data: PaydayRecord[] = JSON.parse(open("./data/paydaydata.json"));

  // Fisher–Yates shuffle
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j]!, data[i]!];
  }

  return data;
});

/**
 * -------------------------------------------------
 * Constants
 * -------------------------------------------------
 */
const URL = "https://api.staging.useferry.com/webhooks/highnote";

const headers: Headers = {
  "Content-Type": "application/json",
  "highnote-signature":
    "42d91f37dc6be8b54a39df6ff525eaaa0fcb4788dbef9f533a319f9e1399ab05"
};

/**
 * -------------------------------------------------
 * Random ID generator
 * -------------------------------------------------
 */
function randomId(prefix: string, length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * -------------------------------------------------
 * Execution options — 102 iterations, ~1 hour
 * -------------------------------------------------
 */
export const options = {
  scenarios: {
    payday_webhook_test: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 102,
      maxDuration: "1h",
      exec: "default"
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"]
  }
};

/**
 * -------------------------------------------------
 * Default function
 * -------------------------------------------------
 */
export default function (): void {
  // Ensure we never access out-of-bounds
  const recordIndex = __ITER % testData.length;
  const { financialAccountId } = testData[recordIndex]!;

  const id = randomId("ee_", 25);
  const transactionId = randomId("eftet_", 25);

  /**
   * -------------------------
   * FIRST WEBHOOK — INITIATED
   * -------------------------
   */
  const firstPayload = JSON.stringify({
    data: {
      node: {
        __typename: "NotificationEvent",
        createdAt: new Date().toISOString(),
        id: "NOTIFICATION_EVENT_ID",
        name: "ACH_EXTERNALLY_INITIATED_DEPOSIT_RECEIVED",
        node: {
          __typename: "AchExternallyInitatedDepositReceivedEvent",
          amount: { value: 67000, currencyCode: "USD", decimalPlaces: 2 },
          companyEntryDescription: "TestDesc",
          companyIdentifier: "TestID",
          companyName: "TestName",
          createdAt: new Date().toISOString(),
          financialAccountId,
          id,
          transactionId,
          settlementDate: "2022-07-28T00:00:00.000Z",
          transferStatus: { status: "INITIATED" },
          updatedAt: new Date().toISOString()
        }
      }
    }
  });

  const res1: RefinedResponse<ResponseType> = http.post(URL, firstPayload, { headers });
  check(res1, { "INITIATED webhook success": (r) => r.status === 200 });

  sleep(1);

  /**
   * -------------------------
   * SECOND WEBHOOK — PROCESSED
   * -------------------------
   */
  const secondPayload = JSON.stringify({
    data: {
      node: {
        __typename: "NotificationEvent",
        createdAt: new Date().toISOString(),
        id: "NOTIFICATION_EVENT_ID",
        name: "ACH_EXTERNALLY_INITIATED_DEPOSIT_PROCESSED",
        node: {
          __typename: "AchExternallyInitatedDepositProcessedEvent",
          amount: { value: 67000, currencyCode: "USD", decimalPlaces: 2 },
          companyEntryDescription: "TestDesc",
          companyIdentifier: "TestID",
          companyName: "TestName",
          createdAt: new Date().toISOString(),
          financialAccountId,
          id,
          transactionId,
          settlementDate: "2022-07-28T00:00:00.000Z",
          transferStatus: { status: "PROCESSING" },
          updatedAt: new Date().toISOString()
        }
      }
    }
  });

  const res2: RefinedResponse<ResponseType> = http.post(URL, secondPayload, { headers });
  check(res2, { "PROCESSED webhook success": (r) => r.status === 200 });

  /**
   * -------------------------
   * Spread executions evenly (~35s per iteration)
   * -------------------------
   */
  sleep(35);
}
