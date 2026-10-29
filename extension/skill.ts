// Claude Code skill on view hints (`H5WEB_*` attributes), kept in step with the viewer of this version
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import {
  type ExtensionContext,
  type LogOutputChannel,
  workspace,
} from 'vscode';

const CLAUDE_DIR = path.join(homedir(), '.claude');
const SKILL_FILE = path.join(CLAUDE_DIR, 'skills/h5web-view-hints/SKILL.md');

export async function installSkill(
  context: ExtensionContext,
  outputChannel: LogOutputChannel,
): Promise<void> {
  const enabled = workspace
    .getConfiguration('h5webFork')
    .get<boolean>('claudeSkill', true);

  // Only for users of Claude Code
  if (!enabled || !existsSync(CLAUDE_DIR)) {
    return;
  }

  try {
    const source = await readFile(
      path.join(context.extensionPath, 'CLAUDE_SKILL.md'),
      'utf8',
    );
    const skill = source.replaceAll(
      '{{VIEW_HINTS_PATH}}',
      path.join(context.extensionPath, 'VIEW_HINTS.md'),
    );

    const current = existsSync(SKILL_FILE)
      ? await readFile(SKILL_FILE, 'utf8')
      : undefined;
    if (current !== skill) {
      await mkdir(path.dirname(SKILL_FILE), { recursive: true });
      await writeFile(SKILL_FILE, skill);
      outputChannel.info(`Installed Claude Code skill: ${SKILL_FILE}`);
    }
  } catch (error) {
    outputChannel.warn(
      `Could not install Claude Code skill: ${(error as Error).message}`,
    );
  }
}
