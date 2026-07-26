// src/utils/paymentPolicy.js


import { prisma } from '../lib/prisma.js';
import { DEFAULT_PAYMENT_POLICY, validatePaymentPolicyShape } from './paymentPolicyCore.js';

export const PAYMENT_POLICY_KEY = 'payment_policy';

export { DEFAULT_PAYMENT_POLICY, validatePaymentPolicyShape, computeDepositAmount } from './paymentPolicyCore.js';

export async function getPaymentPolicyConfig() {
  const row = await prisma.settings.findUnique({ where: { key: PAYMENT_POLICY_KEY } });
  if (!row?.value) return DEFAULT_PAYMENT_POLICY;
  const err = validatePaymentPolicyShape(row.value);
  if (err) return DEFAULT_PAYMENT_POLICY;
  return row.value;
}

export async function setPaymentPolicyConfig(policy) {
  const err = validatePaymentPolicyShape(policy);
  if (err) throw new Error(err);
  return prisma.settings.upsert({
    where: { key: PAYMENT_POLICY_KEY },
    update: { value: policy },
    create: { key: PAYMENT_POLICY_KEY, value: policy, description: 'Deposit requirement at booking time' },
  });
}
