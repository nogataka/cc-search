import { FileText, Search } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">CC Viewer</h1>
          <p className="text-muted-foreground text-lg">
            Unified Log Viewer for Codex and Claude Code
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link href="/projects">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Log Viewer
                </CardTitle>
                <CardDescription>
                  Browse and view conversation logs from Codex and Claude Code
                  sessions
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/search">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-6 w-6" />
                  Log Search
                </CardTitle>
                <CardDescription>
                  Search across all conversation logs from both Codex and Claude
                  Code
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
