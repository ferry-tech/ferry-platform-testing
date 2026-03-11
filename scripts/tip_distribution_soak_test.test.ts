import http, { RefinedResponse } from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

// ─────────────────────────────────────────────
// Custom metric
// ─────────────────────────────────────────────
export const e2eLatency = new Trend('tips_e2e_latency_ms');

// Load employees once
const employees: string[] = new SharedArray('employee-data', () => {
  const json = JSON.parse(open('./data/tipdistributiondata.json'));
  return json.employeeIds as string[];
});
// ─────────────────────────────────────────────
// Options (Soak test config)
// ─────────────────────────────────────────────
export const options = {
  scenarios: {
    soak_test: {
      executor: 'shared-iterations',

      vus: 1,              // single steady worker
      iterations: employees.length,     // matches employee count
      maxDuration: '1h',   // safety stop at 1 hour
    },
  },

  thresholds: {
    tips_e2e_latency_ms: [
      'p(50)<3000',
      'p(95)<8000',
      'p(99)<12000',
    ],
  },
} as const;

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const enqueueUrl: string =
  'https://api.staging.useferry.com/api/distributions/tips';

const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6Imp3ay10ZXN0LTQ4NmMxZDYyLWFjNjItNDc1YS04ZGRkLWExZGU5NTlhYmI3YyIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsicHJvamVjdC10ZXN0LTc4YzZmNzgwLTY1YjItNDk2Yi04OTdhLWVmZDQ4NjRmNWRlNCJdLCJleHAiOjE3NzA4MDAzMDYsImh0dHBzOi8vc3R5dGNoLmNvbS9zZXNzaW9uIjp7ImlkIjoic2Vzc2lvbi10ZXN0LWJjOWY1YWQ1LTJhMDItNDYzNy04NzE0LTkxMzNiMTg5N2ExNyIsInN0YXJ0ZWRfYXQiOiIyMDI2LTAyLTExVDA4OjUzOjI2WiIsImxhc3RfYWNjZXNzZWRfYXQiOiIyMDI2LTAyLTExVDA4OjUzOjI2WiIsImV4cGlyZXNfYXQiOiIyMDI2LTAyLTE4VDA4OjUzOjI2WiIsImF0dHJpYnV0ZXMiOnsidXNlcl9hZ2VudCI6IiIsImlwX2FkZHJlc3MiOiIifSwiYXV0aGVudGljYXRpb25fZmFjdG9ycyI6W3sidHlwZSI6InBhc3N3b3JkIiwiZGVsaXZlcnlfbWV0aG9kIjoia25vd2xlZGdlIiwibGFzdF9hdXRoZW50aWNhdGVkX2F0IjoiMjAyNi0wMi0xMVQwODo1MzoyNloifV0sInJvbGVzIjpbInN0eXRjaF91c2VyIl19LCJpYXQiOjE3NzA4MDAwMDYsImlzcyI6InN0eXRjaC5jb20vcHJvamVjdC10ZXN0LTc4YzZmNzgwLTY1YjItNDk2Yi04OTdhLWVmZDQ4NjRmNWRlNCIsIm5iZiI6MTc3MDgwMDAwNiwic3ViIjoidXNlci10ZXN0LTJkY2RjMTRlLTJlYmUtNGViOS1hYjQ4LTQxNjcyMTg0NmI4MiJ9.fXimxRz7646GR2BU7gHke9W8eL7x2OHM07wH3d9U59_wA384KcW6EIdsYrWvO1xhaYtnZ5GM9lGa8LX_w_zL0pBTfEg4GNF2fVrKsLjWAokSGIqRN8yQWTjvPAWsbkZV9sfURbQuizbShU3ObZUxxFL31AGKhwxanB2cDUx6Alt8p_BiI7KIwpoYaJUzFOMDefPbVgwsAh9HHSkCOy83KcixM0e6Bu0cG_ZTIPWP-96RqtXQYF8zgQxctzNYwet6NKXyWJGkdMykRnp0V4ec8lHbA7237oeExSbdVDVFvTL2YImfpseO60UunJnxUvw-gpTlY3oblOxo1NvXhWgEsQ';

// Ensure token exists
if (!token) {
  throw new Error('TOKEN is wrong or expired');
}

// 36-second pacing to stretch across ~1 hour
const REQUEST_GAP_SECONDS = 36;

// ─────────────────────────────────────────────
// Default test function
// ─────────────────────────────────────────────
export default function (): void {
  const iteration: number = exec.scenario.iterationInTest;

  // Extra safety (should not trigger)
  if (iteration >= employees.length) {
    return;
  }

  const employeeId: string = employees[iteration];

  const payload = Array.from({ length: 50 }, (_, i) => ({
    idempotencyKey: `e2e-${Date.now()}-${i}`,
    businessLocationId: 'TXF',
    employeeId,
    amount: 500,
    distributedAt: new Date().toISOString(),
  }));

  const start: number = Date.now();

  const res: RefinedResponse<'text'> = http.post(
    enqueueUrl,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      tags: { name: 'Tips_E2E_Enqueue' },
      timeout: '300s',
    }
  );

  // Record latency
  e2eLatency.add(Date.now() - start);

  // Validate response
  check(res, {
    'enqueue success': (r) => r.status === 200,
  });

  //  soak pacing
  sleep(REQUEST_GAP_SECONDS);
}
