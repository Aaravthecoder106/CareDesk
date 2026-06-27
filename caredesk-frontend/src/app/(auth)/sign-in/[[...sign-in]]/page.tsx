import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-bg to-white flex flex-col relative overflow-hidden">
      {/* Background glass orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-navy/5 rounded-full blur-3xl" />

      <div className="p-6 relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-navy rounded-xl flex items-center justify-center shadow-lg shadow-navy/20">
            <Heart className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="text-xl font-bold text-navy">
            care<span className="text-blue">desk</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-16 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-navy">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-2">Sign in to access your health dashboard</p>
          </div>

          <div className="bg-white/60 backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-2xl shadow-slate-200/50 border border-white/60 p-8">
            <SignIn
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0 w-full",
                  formButtonPrimary:
                    "bg-navy hover:bg-navy-light text-white font-semibold rounded-lg shadow-lg shadow-navy/20",
                  socialButtonsBlockButton:
                    "border border-slate-200 rounded-lg text-slate-700 font-medium bg-white/50 backdrop-blur-sm",
                  formFieldInput:
                    "rounded-lg border-slate-200 focus:border-blue focus:ring-blue bg-white/50 backdrop-blur-sm",
                  footerActionLink: "text-blue hover:text-navy",
                },
              }}
            />
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-semibold text-blue hover:text-navy">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
