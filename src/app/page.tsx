import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">The North</h1>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Google Ads,
            <br />
            managed for you
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            We create and manage your Google Ads campaigns so you can focus on
            running your business. Professional ad management starting at
            $99/month.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
