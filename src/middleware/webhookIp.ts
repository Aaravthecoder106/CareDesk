import { Request, Response, NextFunction } from "express";

const STRIPE_IPS = [
  "54.187.174.169",
  "54.187.205.252",
  "54.241.143.217",
  "54.241.144.65",
  "34.214.176.123",
  "35.166.221.69",
  "35.166.249.176",
  "44.232.52.0/24",
  "44.232.53.0/24",
];

const RAZORPAY_IPS = [
  "52.66.116.135",
  "52.66.143.178",
  "13.232.126.106",
  "13.233.163.245",
  "103.149.201.0/24",
  "103.7.136.0/24",
  "182.18.184.0/24",
];

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function cidrMatch(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split("/");
  const mask = bits ? ~((1 << (32 - parseInt(bits))) - 1) >>> 0 : 0xFFFFFFFF;
  return (ipToNumber(ip) & mask) === (ipToNumber(range) & mask);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "";
}

export function webhookIpAllowlist(allowedCidrs: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
      return next();
    }

    const clientIp = getClientIp(req);
    const normalizedIp = clientIp.replace(/^::ffff:/, "");

    const isAllowed = allowedCidrs.some((cidr) => {
      if (cidr.includes("/")) {
        return cidrMatch(normalizedIp, cidr);
      }
      return normalizedIp === cidr;
    });

    if (!isAllowed) {
      console.warn(`[SECURITY] Webhook rejected from unauthorized IP: ${normalizedIp}`);
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    next();
  };
}

export function stripeWebhookIpAllowlist() {
  return webhookIpAllowlist(STRIPE_IPS);
}

export function razorpayWebhookIpAllowlist() {
  return webhookIpAllowlist(RAZORPAY_IPS);
}
