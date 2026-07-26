// src/utils/paymentPolicyCore.js


export const DEFAULT_PAYMENT_POLICY = {

  requireDeposit: false,
  depositType: 'PERCENTAGE', 
  depositAmount: 20,          
};

export function validatePaymentPolicyShape(policy) {
  if (!policy || typeof policy !== 'object') return 'Payment policy must be an object';
  if (typeof policy.requireDeposit !== 'boolean') return 'requireDeposit must be true/false';
  if (policy.requireDeposit) {
    if (!['PERCENTAGE', 'FIXED'].includes(policy.depositType)) {
      return 'depositType must be PERCENTAGE or FIXED';
    }
    if (typeof policy.depositAmount !== 'number' || policy.depositAmount <= 0) {
      return 'depositAmount must be a positive number';
    }
    if (policy.depositType === 'PERCENTAGE' && policy.depositAmount > 100) {
      return 'depositAmount as a percentage cannot exceed 100';
    }
  }
  return null; // valid
}

/** Given a full service price and the policy, returns the amount due at booking time (0 if no deposit required). */
export function computeDepositAmount(fullPrice, policy) {
  if (!policy.requireDeposit) return 0;
  if (policy.depositType === 'PERCENTAGE') {
    return Math.round((fullPrice * policy.depositAmount) / 100 * 100) / 100;
  }
  return Math.min(policy.depositAmount, fullPrice);
}
