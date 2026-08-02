// Portfolio page — the front door to the entire showcase.
// Replaces the newspaper-style landing page with a responsive project grid.
// Static data from lib/projects.ts, no DB fetch — force-dynamic not needed.
import { ExternalLink } from "lucide-react";
import { projects } from "@/lib/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Projects"
        description="Fullstack demo apps — deployed at $0"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.slug}
            className="flex flex-col transition-shadow hover:shadow-md"
          >
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {project.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">Demo:</span>{" "}
                <span className="font-mono">{project.demoEmail}</span>{" "}
                <span className="text-muted-foreground">/</span>{" "}
                <span className="font-mono">{project.demoPassword}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {project.mockServices.map((svc) => (
                  <Badge
                    key={svc}
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    Uses simulated {svc}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Live Demo
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
