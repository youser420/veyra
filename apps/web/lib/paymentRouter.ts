export function getPaymentGateway(countryCode: string): "stripe" | "razorpay" {
  return ["IN"].includes(countryCode) ? "razorpay" : "stripe";
}
