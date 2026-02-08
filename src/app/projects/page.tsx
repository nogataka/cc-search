import { ArrowLeft, HistoryIcon } from "lucide-react";
import Link from "next/link";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  ClaudeCodeProjectList,
  CodexProjectList,
} from "./components/ProjectList";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          ホームへ戻る
        </Link>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <HistoryIcon className="w-8 h-8" />
          プロジェクト一覧
        </h1>
        <p className="text-muted-foreground">
          Claude Code・Codexのプロジェクトを選んで会話履歴を閲覧
        </p>
      </header>

      <main>
        <section>
          <h2 className="text-xl font-semibold mb-4">プロジェクト</h2>

          <Tabs defaultValue="claude-code" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="codex">Codex</TabsTrigger>
            </TabsList>
            <TabsContent value="claude-code" className="mt-6">
              <ClaudeCodeProjectList />
            </TabsContent>
            <TabsContent value="codex" className="mt-6">
              <CodexProjectList />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
