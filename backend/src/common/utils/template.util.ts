const TEMPLATE_REGEX = /\{\{(\w+)\}\}/g;

export function extractTemplateVariables(content: string): string[] {
  const variables = new Set<string>();
  let match = TEMPLATE_REGEX.exec(content);
  while (match) {
    if (match[1]) {
      variables.add(match[1]);
    }
    match = TEMPLATE_REGEX.exec(content);
  }
  TEMPLATE_REGEX.lastIndex = 0;
  return Array.from(variables);
}

export function applyTemplateVariables(
  content: string,
  variables: Record<string, string>,
): string {
  return content.replace(TEMPLATE_REGEX, (_, variableName: string) => {
    return variables[variableName] ?? `{{${variableName}}}`;
  });
}
