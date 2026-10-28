import Link from "next/link";
import { notFound } from "next/navigation";
import ContentShell from "@/components/ContentShell";
import LessonExercise from "@/components/LessonExercise";
import { LESSONS } from "@/lib/lessons";
import AdCard from "@/components/AdCard";
import { sponsorConfig } from "@/lib/sponsor";
import ResponsiveAd from "@/components/ResponsiveAd";
import LessonWalkthrough from "@/components/LessonWalkthrough";
import { LESSON_EXAMPLES } from "@/lib/lessonExamples";
export function generateStaticParams() { return LESSONS.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const lesson = LESSONS.find((item) => item.slug === slug);
  return lesson ? { title: `${lesson.title} | ChessNexa`, description: lesson.description, alternates: { canonical: `/learn/${lesson.slug}` } } : {};
}
export default async function Lesson({ params }) {
  const { slug } = await params;
  const lesson = LESSONS.find((item) => item.slug === slug);
  if (!lesson) notFound();
  const examples = LESSON_EXAMPLES[slug] || [];
  const words = [lesson.sections.flatMap((section) => section.text).join(" "), ...examples.map((example) => [example.introduction, example.takeaway, ...example.steps.map((step) => step.note)].join(" "))].join(" ").split(/\s+/).length;
  return <ContentShell><Link href="/learn" className="lesson-link">← All chess guides</Link><article><span className="eyebrow">{lesson.category} · {Math.max(1, Math.ceil(words / 180))} min read</span><h1>{lesson.title}</h1><p className="content-lead">{lesson.description}</p>
    <nav className="lesson-toc" aria-label="On this page"><strong>In this guide</strong>{lesson.sections.map((section, i) => <a key={i} href={`#section-${i}`}>{section.title}</a>)}{examples.map((example) => <a key={example.id} href={`#${example.id}`}>Worked example: {example.title}</a>)}</nav>
    {lesson.sections.map((section, i) => <section id={`section-${i}`} key={i}><h2>{section.title}</h2>{section.text.map((paragraph, j) => <p key={j}>{paragraph}</p>)}</section>)}
    {LESSON_EXAMPLES[slug]?.map((example) => <LessonWalkthrough key={example.id} example={example} />)}
    {lesson.challenge && <LessonExercise key={slug} challenge={lesson.challenge} />}
    <h2>Put it into practice</h2><p><Link href="/">Play a game on ChessNexa</Link>, then use the move history to review one moment where this idea mattered. You can also try a mate-in-one puzzle in the Puzzles tab.</p>
    <p className="sub">Guide methodology: <Link href="/editorial">how these explanations and examples are checked</Link>. Found an issue? <Link href="/contact">Suggest a correction</Link>.</p>
  </article><ResponsiveAd /><div className="article-sponsor"><AdCard format="banner" sponsor={sponsorConfig()} /></div><div className="related-lessons"><h2>Keep learning</h2>{LESSONS.filter((item) => item.slug !== slug).slice(0, 3).map((item) => <Link key={item.slug} href={`/learn/${item.slug}`}>{item.title} →</Link>)}</div></ContentShell>;
}
