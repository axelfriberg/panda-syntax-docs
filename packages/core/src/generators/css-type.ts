import fs from 'fs-extra'
import path from 'path'
import outdent from 'outdent'

async function getCssType(file: string) {
  const cssType = require.resolve('@css-panda/types')
  const cssPath = path.join(path.dirname(cssType), 'src', file)
  return fs.readFile(cssPath, 'utf8')
}

export async function generateCssType() {
  return {
    cssType: await getCssType('csstype.d.ts'),
    pandaCssType: await getCssType('panda-csstype.ts'),
    publicType: outdent`
    import { CssObject, ConditionalValue } from './panda-csstype'
    import { PropertyTypes } from './property-type'
    import { Conditions } from './conditions'
    
    export type UserCssObject = CssObject<Conditions, PropertyTypes>
    export type UserConditionalValue<V> = ConditionalValue<Conditions, V>
    `,
  }
}
