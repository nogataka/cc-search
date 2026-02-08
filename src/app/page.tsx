"use client";

import { FolderSearch, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";

export default function HomePage() {
  const [quickQuery, setQuickQuery] = useState("");
  const router = useRouter();

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(quickQuery.trim())}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">CC Search</h1>
          <p className="text-muted-foreground text-lg">
            Codex・Claude Code 統合ログ検索
          </p>
        </div>

        <form
          onSubmit={handleQuickSearch}
          className="flex gap-2 max-w-lg mx-auto mb-12"
        >
          <Input
            type="text"
            placeholder="キーワードで横断検索..."
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!quickQuery.trim()}>
            <Search className="h-4 w-4 mr-2" />
            検索
          </Button>
        </form>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link href="/projects">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderSearch className="h-6 w-6" />
                  プロジェクトから絞り込む
                </CardTitle>
                <CardDescription>
                  プロジェクト単位で会話ログを閲覧・検索できます
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/search">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-6 w-6" />
                  キーワードや期間で絞り込む
                </CardTitle>
                <CardDescription>
                  キーワード、期間、ツール種別で横断的に検索できます
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
