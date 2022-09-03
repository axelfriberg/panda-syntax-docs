import { ConfigNotFoundError } from '@css-panda/error'
import { info } from '@css-panda/logger'
import { loadConfigFile } from '@css-panda/read-config'
import type { Config, UserConfig } from '@css-panda/types'
import fs from 'fs-extra'
import merge from 'lodash.merge'
import { recrawl } from 'recrawl'
import { createContext } from './create-context'
import { createDebug, debug } from './debug'
import { extractContent } from './extract-content'
import { extractTemp } from './extract-tmp'
import { generateSystem } from './generators'
import { updateGitIgnore } from './git-ignore'
import { watch } from './watchers'

export async function generator(options: Config & { configPath?: string } = {}) {
  const { cwd = process.cwd(), configPath, ...rest } = options

  debug('Panda generator starting...')

  const conf = await loadConfigFile<UserConfig>({ root: cwd, file: configPath })
  merge(conf.config, { cwd, ...rest })

  createDebug('config:file', conf)

  if (!conf.config) {
    throw new ConfigNotFoundError({ cwd, path: conf.path })
  }

  const ctx = createContext(conf)

  createDebug('context', ctx)

  if (conf.config.clean) {
    await fs.emptyDir(ctx.outdir)
  }

  await updateGitIgnore(ctx)

  await generateSystem(ctx, conf.code)

  info('⚙️ generated system')

  if (ctx.watch) {
    watch(ctx, {
      onConfigChange() {
        return generator({ ...options, clean: false })
      },
      onTmpChange() {
        return extractTemp(ctx)
      },
      onContentChange(file) {
        return extractContent(ctx, file)
      },
    })
  } else {
    const crawl = recrawl({
      only: ctx.include,
      skip: ctx.exclude,
    })

    await crawl(ctx.cwd, (file) => {
      createDebug('file:', file)
      extractContent(ctx, file)
    })

    await extractTemp(ctx)
  }
}
