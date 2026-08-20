import http from 'k6/http';
import { check } from 'k6';
import { scenario } from 'k6/execution';

// ---------------------------------------------------------------------------
// Fixed test parameters
// ---------------------------------------------------------------------------
const USER_IDS = Array.from({ length: 10 }, (_, i) => i + 1); // 1..10
const SHIFTS = [1, 2];
const REQUESTS_PER_DAY = USER_IDS.length * SHIFTS.length;     // 10 users * 2 shifts = 20
const NUM_DATES = 500;                                        // 500 distinct business dates
const TOTAL_ITERATIONS = REQUESTS_PER_DAY * NUM_DATES;        // 20 * 500 = 10000

const BUSINESS_DATE_START = new Date('2025-05-20T04:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const options = {
  scenarios: {
    tenant_eat: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: TOTAL_ITERATIONS,
      maxDuration: '30m'
    }
  }
};

interface TipShare {
  shift: number;
  amount: number;
  userId: number;
  storeId: number;
  userJobCode: number;
}

interface PayloadTemplate {
  tipsShare: TipShare[];
  [key: string]: unknown;
}

const config: { url: string; authToken: string; payloadTemplate: PayloadTemplate } =
  JSON.parse(open('./config.json'));

const url = config.url;
const authToken = config.authToken;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// businessDate: 2025-01-01T04:00:00, 2025-01-02T04:00:00, ... (one date per "day" index)
function generateBusinessDate(dayIndex: number): string {
  const d = new Date(BUSINESS_DATE_START.getTime() + dayIndex * MS_PER_DAY);
  return d.toISOString().slice(0, 19); // strip milliseconds + trailing "Z"
}

// random tip amount between 1 and 20, 2 decimal places
function getRandomAmount(): number {
  const amount = Math.random() * (20 - 1) + 1;
  return Math.round(amount * 100) / 100;
}

// declarationDate: kept as "some time before now", same behavior as before
function generatePastDate(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - Math.floor(Math.random() * 1000));
  return date.toISOString();
}

// Deterministically map a global iteration index (0..9999) to:
//   - dayIndex  (0..499)   -> which business date
//   - userId    (1..10)
//   - shift     (1 or 2)
// Layout per day: 20 requests = 10 users x 2 shifts (shift 1 then shift 2 per user)
function resolveIteration(iterationIndex: number) {
  const dayIndex = Math.floor(iterationIndex / REQUESTS_PER_DAY);
  const withinDay = iterationIndex % REQUESTS_PER_DAY;
  const userIndex = Math.floor(withinDay / SHIFTS.length);
  const shiftIndex = withinDay % SHIFTS.length;

  return {
    businessDate: generateBusinessDate(dayIndex),
    userId: USER_IDS[userIndex],
    shift: SHIFTS[shiftIndex]
  };
}

function createPayload(iterationIndex: number) {
  const { businessDate, userId, shift } = resolveIteration(iterationIndex);
  const amount = getRandomAmount();
  const baseShare = config.payloadTemplate.tipsShare[0];

  return {
    ...config.payloadTemplate,
    shift,
    businessDate,
    serverUserId: userId,
    tipsShare: [
      {
        ...baseShare,
        shift,
        userId,
        amount
      }
    ],
    tipsTotalTipout: 0,
    tipsCreditOrGiftCard: amount,
    declarationDate: generatePastDate()
  };
}

function sendRequest(tenantCode: string) {
  const params = {
    headers: {
      "x-tenant-code": tenantCode,
      Authorization: authToken,
      "request-date": "2026-03-19",
      "Content-Type": "application/json"
    }
  };

  const iterationIndex = scenario.iterationInTest;
  const res = http.post(url, JSON.stringify(createPayload(iterationIndex)), params);

  check(res, {
    "tipout created": (r) => r.status === 200 || r.status === 201,
  });
}

export default function () {
  sendRequest("eat-nMfEmx");
}
