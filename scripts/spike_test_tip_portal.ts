import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    create_tipouts: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1m',
      duration: '1m',
      preAllocatedVUs: 5,
      maxVUs: 10,
    },
  },
};

function getRandomServerUserId() {
  return Math.floor(Math.random() * 10) + 1;
}

function generatePastBusinessDate(index) {
  const baseDate = new Date("2026-02-10T23:59:00");
  baseDate.setMinutes(baseDate.getMinutes() - (index + 1) * 5);
  return baseDate.toISOString();
}

export default function () {
  const iteration = __ITER;

  const payload = {
    type: 1,
    shift: 1,
    deposit: 0,
    netSales: 0,
    paidouts: 0,
    sentDate: null,
    tipsCash: 0,
    cashoutId: 114,
    createdAt: "2025-11-21T14:30:17",
    salesCash: 0,
    tipsOther: 0,
    tipsShare: [
      {
        shift: 2,
        amount: 3,
        userId: 1,
        storeId: 666,
        userJobCode: 10
      },
      {
        shift: 2,
        amount: 8,
        userId: 2,
        storeId: 666,
        userJobCode: 10
      }
    ],
    approvedAt: "2026-02-05T14:30:17",
    salesOther: 0,
    salesTotal: 355.85,
    businessDate: generatePastBusinessDate(iteration),
    serverUserId: getRandomServerUserId(),
    tipsDeclared: 0,
    serverJobCode: 10,
    serverStoreId: 666,
    distributionId: "00000000-0000-0000-0000-000000000000",
    isAutoApproved: true,
    declarationDate: generatePastBusinessDate(iteration),
    tipsTotalTipout: 80.34,
    approvedByUserId: null,
    lowCashTipReasons: [],
    salesCreditGiftCard: 355.85,
    tipsCreditOrGiftCard: 80.34,
    lowCashTipsReasonsSeparated: "[]"
  };

  const params = {
    headers: {
      "x-tenant-code": "eat-nMfEmx",
      "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Imp3ay10ZXN0LTQ4NmMxZDYyLWFjNjItNDc1YS04ZGRkLWExZGU5NTlhYmI3YyIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsicHJvamVjdC10ZXN0LTc4YzZmNzgwLTY1YjItNDk2Yi04OTdhLWVmZDQ4NjRmNWRlNCJdLCJleHAiOjE3NzMyNTA2ODEsImlhdCI6MTc3MzI0NzA4MSwiaXNzIjoic3R5dGNoLmNvbS9wcm9qZWN0LXRlc3QtNzhjNmY3ODAtNjViMi00OTZiLTg5N2EtZWZkNDg2NGY1ZGU0IiwibmJmIjoxNzczMjQ3MDgxLCJzY29wZSI6IndyaXRlOnRpcG91dHMiLCJzdWIiOiJtMm0tY2xpZW50LXRlc3QtZGQ4MjI1NWYtYjIwNC00YWMxLWIxOGQtZGE0Y2RkZWU3YjIzIn0.utleVqtD8r-SnuILEo_PMgASLyOEG0M-oT3H99AdSwW-3x8LupJjHDugwaYZPkKa1rccTEErs9PpWd1jxKciuvajiOd6IG9Wg6Az2-jxKV6NYp94pfRn-Afd8SRaB07I8ftfQ5bHHkLAE00EHsykQv68uHuTeYtOmAL2SvnVBeuwQqM200Q6SMYDuFstY6Q3Ndhf4vhaH1rT1NhIexYzuGHMiyGzPUj_XHLe_EQXjV4Cg2tegdcj3DjEZA3ShyeFhz2eMM7U9KYCJb__6_e_dzqutCSwEiAV9zOX_gQnrdknFerfbVJZgaFkZbmIk327EUyN9UVkBBSgedEiLjimtw",
      "request-date": "2026-03-11",
      "Content-Type": "application/json"
    }
  };

  const res = http.post(
    'https://tipportal-api.staging.useferry.com/api/v1/tip-outs/create',
    JSON.stringify(payload),
    params
  );

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}