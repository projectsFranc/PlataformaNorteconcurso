import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStatus } from '@/hooks/useDashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileStack,
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/editais')({
  component: EditaisPage,
});

interface ExamDoc {
  id: string;
  contest_name: string;
  contest_year: string | null;
  exam_board: string | null;
  doc_type: string;
  role_cargo: string | null;
  file_name: string;
  storage_path: string;
  notes: string | null;
  created_at: string;
}

interface RefInfo {
  contest_name: string;
  contest_year: string | null;
  exam_board: string | null;
  cutoff_score: number | null;
  scoring_rule: string | null;
  source_url: string | null;
  notes: string | null;
}

interface YearGroup {
  year: string;
  docs: ExamDoc[];
  ref: RefInfo | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  edital: 'Edital',
  matriz: 'Matriz de Referência',
  prova: 'Prova',
  gabarito: 'Gabarito',
  padrao_resposta: 'Padrão de Resposta',
  outro: 'Outro',
};

const PF_FILTER = '%pol%cia federal%';

function EditaisPage() {
  const { user, isLoading: authLoading } = useAuthStatus();
  const [groups, setGroups] = React.useState<YearGroup[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [openYear, setOpenYear] = React.useState<string | null>(null);
  const [docTypeFilter, setDocTypeFilter] = React.useState<string>('all');
  const [signedUrls, setSignedUrls] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (authLoading) return;

    const load = async () => {
      setIsLoading(true);
      const [docsRes, refRes] = await Promise.all([
        supabase
          .from('official_exam_documents')
          .select('*')
          .ilike('contest_name', PF_FILTER)
          .order('contest_year', { ascending: false }),
        supabase
          .from('contest_reference_info')
          .select('*')
          .ilike('contest_name', PF_FILTER)
          .order('contest_year', { ascending: false }),
      ]);

      const docs = (docsRes.data as ExamDoc[]) || [];
      const refs = (refRes.data as RefInfo[]) || [];

      const map = new Map<string, YearGroup>();
      for (const d of docs) {
        const year = d.contest_year || 'Sem ano identificado';
        if (!map.has(year)) map.set(year, { year, docs: [], ref: null });
        map.get(year)!.docs.push(d);
      }
      for (const r of refs) {
        const year = r.contest_year || 'Sem ano identificado';
        if (!map.has(year)) map.set(year, { year, docs: [], ref: null });
        map.get(year)!.ref = r;
      }

      const sorted = Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
      setGroups(sorted);
      setIsLoading(false);
    };
    load();
  }, [authLoading]);

  const allDocTypes = React.useMemo(() => {
    const set = new Set<string>();
    groups.forEach(g => g.docs.forEach(d => set.add(d.doc_type)));
    return Array.from(set).sort();
  }, [groups]);

  const toggleYear = async (year: string) => {
    if (openYear === year) { setOpenYear(null); return; }
    setOpenYear(year);
    const group = groups.find(g => g.year === year);
    if (!group) return;
    const missing = group.docs.filter(d => !signedUrls[d.id]);
    if (missing.length === 0) return;
    const results = await Promise.all(
      missing.map(d => supabase.storage.from('official-exams').createSignedUrl(d.storage_path, 3600))
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

  if (authLoading || isLoading) return <div className="p-8">Carregando editais da Polícia Federal...</div>;

  const filteredGroups = groups
    .map(g => ({
      ...g,
      docs: docTypeFilter === 'all' ? g.docs : g.docs.filter(d => d.doc_type === docTypeFilter),
    }))
    .filter(g => g.docs.length > 0 || g.ref);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Editais — Polícia Federal</h1>
        <p className="text-muted-foreground">
          Editais, provas e gabaritos oficiais já cadastrados na plataforma, organizados por ano.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40">
        <CardContent className="pt-4 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Esta lista traz apenas os <strong>documentos oficiais</strong> (edital, prova, gabarito) do concurso.
            Leis, súmulas e conteúdo programático citados nas questões passam por verificação de vigência
            antes de entrar no banco de questões — nada revogado ou desatualizado é incluído aqui.
          </p>
        </CardContent>
      </Card>

      {allDocTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            value={docTypeFilter}
            onChange={setDocTypeFilter}
            options={['all', ...allDocTypes]}
            allLabel="Todos os tipos de documento"
          />
        </div>
      )}

      {filteredGroups.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center text-center space-y-4">
          <FileStack className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">Nenhum edital da PF cadastrado ainda</h2>
          <p className="text-muted-foreground max-w-md">
            Assim que os editais, provas e gabaritos forem cadastrados pelo admin, eles aparecem aqui organizados por ano.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(g => {
            const isOpen = openYear === g.year;
            return (
              <Card key={g.year}>
                <CardHeader className="cursor-pointer" onClick={() => toggleYear(g.year)}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-lg">Concurso {g.year}</CardTitle>
                      <CardDescription>
                        {g.docs[0]?.exam_board || g.ref?.exam_board || 'Banca não identificada'} ·{' '}
                        {g.docs.length} documento{g.docs.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      {g.ref?.cutoff_score != null && (
                        <Badge variant="outline" className="gap-1 text-xs font-bold">
                          <Gauge className="h-3 w-3" /> Corte: {g.ref.cutoff_score}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {g.ref && (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                        {g.ref.scoring_rule && <p><strong>Regra de pontuação:</strong> {g.ref.scoring_rule}</p>}
                        {g.ref.notes && <p className="text-muted-foreground">{g.ref.notes}</p>}
                        {g.ref.source_url && (
                          <a
                            href={g.ref.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-secondary text-xs inline-flex items-center gap-1 hover:underline"
                          >
                            Fonte <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {g.docs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {g.docs.map(d => (
                          <a
                            key={d.id}
                            href={signedUrls[d.id] || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 border rounded-lg hover:border-secondary/50 hover:bg-muted/50 transition-colors group"
                          >
                            <FileText className="h-5 w-5 text-secondary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="text-[10px] bg-secondary">
                                  {DOC_TYPE_LABELS[d.doc_type] || d.doc_type}
                                </Badge>
                                {d.role_cargo && (
                                  <span className="text-[10px] text-muted-foreground">{d.role_cargo}</span>
                                )}
                              </div>
                              <p className="text-sm truncate">{d.file_name}</p>
                              {d.notes && <p className="text-[10px] text-muted-foreground truncate">{d.notes}</p>}
                            </div>
                            {signedUrls[d.id] ? (
                              <Download className="h-4 w-4 text-muted-foreground group-hover:text-secondary shrink-0" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground shrink-0">carregando…</span>
                            )}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sem arquivos de edital/prova/gabarito cadastrados para este ano ainda — só há dados de referência.
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, allLabel }: {
  value: string; onChange: (v: string) => void; options: string[]; allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 px-3 rounded-md border bg-background text-sm"
      aria-label="Tipo de documento"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>
          {opt === 'all' ? allLabel : (DOC_TYPE_LABELS[opt] || opt)}
        </option>
      ))}
    </select>
  );
}
