import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  title?: string;
  description?: string;
  code?: string;
}

export function ErrorPage({
  title = "Error",
  description = "Something went wrong",
  code
}: ErrorPageProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
       <div className="space-y-4 text-center">
         {code && <h1 className="text-4xl font-semibold text-foreground">{code}</h1>}
         <h2 className="text-xl font-medium text-foreground">{title}</h2>
         <p className="max-w-md text-muted-foreground">
           {description}
         </p>
         <Button asChild>
           <Link href="/">Return Home</Link>
         </Button>
       </div>
    </div>
  );
}
