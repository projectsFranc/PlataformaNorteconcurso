import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStatus } from '@/hooks/useDashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileStack, CheckCircle2, XCircle, HelpCircle, ExternalLink, Image as ImageIcon } from 'lucide-react';

export const Route = createFileRoute('/dashboard/student-exams')({
  component: StudentExamsPage,
});

interface ExamDoc {
  id: string;
  contest_name: string;
  contest_year: string;
  exam_board: string | null;
  doc_type: string;
  file_name: string;
  storage_path: string;
  correct_count: number | null;
  wrong_count: number | null;
  extracted_data: any;
  created_at: string;
}

interface GroupedExam {
  key: string;
  contest_name: string;
  contest_year: string;
  exam_board: string | null;
  correct_count: number | null;
  wrong_count: number | null;
  pageCount: number;
  extracted_data: any;
  docs: ExamDoc[];
}

function StudentExamsPage() {
  const { user, isLoading: authLoading } = useAuthStatus();
  const [groups, setGroups] = React.useState<GroupedExam[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [signedUrls, setSignedUrls] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (authLoading || !user || user.id === 'demo-user') { setIsLoading(false); return; }

    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('student_exam_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('contest_year', { ascending: true });

      if (error || !data) { setIsLoading(false); return; }

      const map = new Map<string, GroupedExam>();
      for (const doc of data as ExamDoc[]) {
        const key = `${doc.contest_name}__${doc.contest_year}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            contest_name: doc.contest_name,
            contest_year: doc.contest_year,
            exam_board: doc.exam_board,
            correct_count: null,
            wrong_count: null,
            pageCount: 0,
            extracted_data: null,
            docs: [],
          });
        }
        const g = map.get(key)!;
        g.docs.push(doc);
        g.pageCount += 1;
        if (doc.correct_count !== null) g.correct_count = doc.correct_count;
        if (doc.wrong_count !== null) g.wrong_count = doc.wrong_count;
        if (doc.extracted_data) g.extracted_data = doc.extracted_data;
      }
      setGroups(Array.from(map.values()));
      setIsLoading(false);
    };
    load();
  }, [user, authLoading]);

  const openGroup = async (g: GroupedExam) => {
    if (openKey === g.key) { setOpenKey(null); return; }
    setOpenKey(g.key);
    // Gera signed URLs sob demanda (bucket privado)
    const missing = g.docs.filter(d => !signedUrls[d.id]);
    if (missing.length === 0) return;
    const results = await Promise.all(
      missing.map(d => supabase.storage.from('student-exams').createSignedUrl(d.storage_path, 3600))
    );
    setSignedUrls(prev => {
      const next = { ...prev };
      missing.forEach((d, i) => {
        const url = results[i].data?.signedUrl;
        if (url) next[d.id] = url;
      });
      return next;
    });
  };

  if (authLoading || isLoading) return <div className="p-8">Carregando suas provas...</div>;

  if (!user || user.id === 'demo-user') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <FileStack className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Faça login para ver suas provas</h2>
        <p className="text-muted-foreground max-w-md">As provas enviadas ficam vinculadas à sua conta.</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <FileStack className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Nenhuma prova enviada ainda</h2>
        <p className="text-muted-foreground max-w-md">
          Envie fotos do caderno de uma prova que você já realizou para receber o diagnóstico de desempenho.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Minhas Provas</h1>
        <p className="text-muted-foreground">Provas reais que você enviou, com diagnóstico item a item.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {groups.map(g => {
          const total = (g.correct_count || 0) + (g.wrong_count || 0);
          const pct = total > 0 ? Math.round(((g.correct_count || 0) / total) * 100) : null;
          const isOpen = openKey === g.key;
          const official = g.extracted_data?.resultado_oficial;

          return (
            <Card key={g.key}>
              <CardHeader className="cursor-pointer" onClick={() => openGroup(g)}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {g.contest_name} — {g.contest_year}
                      {official && <Badge className="bg-emerald-500">Nota oficial confirmada</Badge>}
                    </CardTitle>
                    <CardDescription>
                      {g.exam_board || 'Banca não identificada'} · {g.pageCount} página{g.pageCount !== 1 ? 's' : ''} enviada{g.pageCount !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {g.correct_count !== null && (
                      <div className="flex items-center gap-1 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="font-bold">{g.correct_count}</span>
                      </div>
                    )}
                    {g.wrong_count !== null && (
                      <div className="flex items-center gap-1 text-sm">
                        <XCircle className="h-4 w-4 text-rose-500" />
                        <span className="font-bold">{g.wrong_count}</span>
                      </div>
                    )}
                    {pct !== null && (
                      <Badge variant="outline" className="text-sm font-bold">{pct}%</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="space-y-4 border-t pt-4">
                  {official && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-sm">
                      <p className="font-bold text-emerald-800 dark:text-emerald-300">Boletim de Desempenho Individual (CEBRASPE)</p>
                      <p className="text-emerald-700 dark:text-emerald-400">
                        Nota Total: {official.nota_total} pts · {official.acertos_total} acertos, {official.erros_total} erros
                        {official.classificacao_ampla_objetiva && <> · {official.classificacao_ampla_objetiva}ª colocação na ampla concorrência</>}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold mb-2 flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Páginas do caderno</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {g.docs.map(d => (
                        <a
                          key={d.id}
                          href={signedUrls[d.id] || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-[3/4] rounded-lg border bg-muted overflow-hidden hover:ring-2 hover:ring-secondary transition-all flex items-center justify-center relative group"
                        >
                          {signedUrls[d.id] ? (
                            <img src={signedUrls[d.id]} alt={d.file_name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">carregando…</span>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
