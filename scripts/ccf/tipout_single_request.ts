import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1
};

const config: { url: string; authToken: string; payloadTemplate: Record<string, unknown> } =
  JSON.parse(open('./config.json'));

const url = config.url;
const authToken = config.authToken;

function createPayload() {
  return {
    ...config.payloadTemplate
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

  const res = http.post(url, JSON.stringify(createPayload()), params);

  check(res, {
    "tipout created": (r) => r.status === 200 || r.status === 201,
  });
}

export default function () {
  sendRequest("eat-nMfEmx");
}
