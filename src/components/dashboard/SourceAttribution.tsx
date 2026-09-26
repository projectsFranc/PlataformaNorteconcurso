import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceAttributionProps {
  examBoard?: string | null;
  contestName: string;
  contestYear?: string | null;
  itemNumber?: number | null;
  className?: string;
}

export function SourceAttribution({ examBoard, contestName, contestYear, itemNumber, className }: SourceAttributionProps) {
  const board = examBoard || 'banca organizadora';
  return (
    <p className={cn('flex items-start gap-1 text-[10px] text-muted-foreground/70 leading-relaxed', className)}>
      <Info className="h-3 w-3 shrink-0 mt-0.5" />
      <span>
        Fonte: prova oficial {board} — {contestName}
        {contestYear ? ` ${contestYear}` : ''}
        {itemNumber != null ? `, item ${itemNumber}` : ''}. Reproduzido apenas para fins educacionais de preparação para
        concurso; direitos do enunciado original pertencem à banca examinadora.
      </span>
    </p>
  );
}

export function SourceAttributionFooter({ className }: { className?: string }) {
  return (
    <p className={cn('text-[10px] text-muted-foreground/60 text-center leading-relaxed', className)}>
      Provas, gabaritos e editais exibidos nesta página são materiais oficiais das respectivas bancas
      organizadoras, disponibilizados publicamente por elas. Uso exclusivamente educacional, sem finalidade
      comercial sobre o conteúdo original. Em caso de solicitação de remoção pela banca, contate o suporte.
    </p>
  );
}
