import { HistoryIcon } from "lucide-react";
import {
  ClaudeCodeProjectList,
  CodexProjectList,
} from "./components/ProjectList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <HistoryIcon className="w-8 h-8" />
          CC Viewer
        </h1>
        <p className="text-muted-foreground">
          Browse your Claude Code and Codex conversation history
        </p>
      </header>

      <main>
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Projects</h2>

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
