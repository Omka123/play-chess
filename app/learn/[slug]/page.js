import Link from "next/link";
import { notFound } from "next/navigation";
import ContentShell from "@/components/ContentShell";
import LessonExercise from "@/components/LessonExercise";
import { LESSONS } from "@/lib/lessons";
export function generateStaticParams() { return LESSONS.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const lesson = LESSONS.find((item) => item.slug === slug);
  return lesson ? { title: `${lesson.title} | ChessNexa`, description: lesson.description } : {};
}
export default async function Lesson({ params }) {
  const { slug } = await params;
  const lesson = LESSONS.find((item) => item.slug === slug);
  if (!lesson) notFound();
  return <ContentShell><Link href="/learn" className="lesson-link">← All chess guides</Link><article><span className="eyebrow">{lesson.category}</span><h1>{lesson.title}</h1><p className="content-lead">{lesson.description}</p>
    <nav className="lesson-toc" aria-label="On this page"><strong>In this guide</strong>{lesson.sections.map((section, i) => <a key={i} href={`#section-${i}`}>{section.title}</a>)}</nav>
    {lesson.sections.map((section, i) => <section id={`section-${i}`} key={i}><h2>{section.title}</h2>{section.text.map((paragraph, j) => <p key={j}>{paragraph}</p>)}</section>)}
    {lesson.challenge && <LessonExercise challenge={lesson.challenge} />}
    <h2>Put it into practice</h2><p><Link href="/">Play a game on ChessNexa</Link>, then use the move history to review one moment where this idea mattered. You can also try a mate-in-one puzzle in the Puzzles tab.</p>
  </article><div className="related-lessons"><h2>Keep learning</h2>{LESSONS.filter((item) => item.slug !== slug).map((item) => <Link key={item.slug} href={`/learn/${item.slug}`}>{item.title} →</Link>)}</div></ContentShell>;
}
