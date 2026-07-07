import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ALL_TOOLS, findTool } from '@/components/tool-data';
import { Workspace } from '@/components/Workspace';

type ToolPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return ALL_TOOLS.map((tool) => ({ slug: tool.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = ALL_TOOLS.find((item) => item.slug === slug);

  if (!tool) {
    return {
      title: 'Tool not found | filesuite.dev',
    };
  }

  return {
    title: `${tool.name} | filesuite.dev`,
    description: `${tool.description} Runs in your browser where supported.`,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = ALL_TOOLS.find((item) => item.slug === slug);

  if (!tool) notFound();

  return <Workspace initialToolId={findTool(slug).id} />;
}
