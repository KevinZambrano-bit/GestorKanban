export function buildSubtaskPrompt(task: string): string {
  return `Teniendo en cuenta la siguiente tarea de desarrollo de software:

${task}

Genera entre 5 y 10 subtareas claras, concretas y ordenadas.

Responde únicamente en formato JSON:

{
  "subtasks": [
    "Subtarea 1",
    "Subtarea 2"
  ]
}`;
}
