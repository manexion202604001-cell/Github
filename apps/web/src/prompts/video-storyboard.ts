import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

export const videoStoryboardSchema = z.object({
  strategy: z.string(),
  concept: z.string(),
  script: z.string(),
  scenes: z
    .array(
      z.object({
        order: z.number().int().min(1),
        startSec: z.number().min(0),
        endSec: z.number().min(0),
        role: z.string(),
        description: z.string(),
        narration: z.string().nullable(),
        caption: z.string().nullable(),
        cameraNote: z.string().nullable(),
      }),
    )
    .min(3),
})

export type VideoStoryboardOutput = z.infer<typeof videoStoryboardSchema>

export type VideoStoryboardInput = {
  context: ProjectContextSnapshot
  purpose: string
  videoType: string
  durationSec: number
  aspectRatio: string
}

/** STEP 11: 動画戦略からストーリーボードまでを設計する(要件59〜63)。 */
export const videoStoryboardTask: AITask<VideoStoryboardInput, VideoStoryboardOutput> = {
  id: 'video-storyboard',
  system: `${BASE_SYSTEM}

PR動画の構成を設計してください。動画そのものは外部サービスが生成するため、
ここでは「何を撮るか」を人間にも生成AIにも伝わる粒度で書きます。

ルール:
- scenes の endSec は次のシーンの startSec と一致させ、最後のシーンの endSec は指定尺と一致させる。
- 最初の3秒で視聴者の離脱を防ぐフックを置く。
- caption は画面に出るテロップ(15文字以内)。
- description は映像の内容(被写体・動き・構図)を1〜2文で。抽象語を避ける。
- narration は音声ナレーション。不要なシーンは null。
- 縦型(9:16)の場合は被写体を画面中央上寄りに置く指示を入れる。`,
  schema: videoStoryboardSchema,
  buildUser: (input) =>
    `${formatProjectContext(input.context)}\n\n## 動画要件\n用途: ${input.purpose}\nタイプ: ${input.videoType}\n尺: ${input.durationSec}秒\nアスペクト比: ${input.aspectRatio}\n\nストーリーボードを作成してください。`,
  mock: (input) => {
    const unit = input.durationSec / 5
    const name = input.context.product?.name ?? '商品'
    return {
      strategy: `【サンプル】${input.purpose}向けに、購入前の最大の不安である「置き場所」と「手入れ」を冒頭で提示し、商品がそれを解決する様子を実演で見せる構成。`,
      concept: '「片付けやすさ」を主役にした実演型ショート動画',
      script: `冒頭で散らかった収納棚を映し、「置き場所、ありますか?」と問いかける。${name}を取り出し、折りたたんで棚に収める様子を実演。最後に価格とブランド名を提示する。`,
      scenes: [
        {
          order: 1,
          startSec: 0,
          endSec: Number(unit.toFixed(1)),
          role: '問題提起',
          description: '物が詰まった収納棚のクローズアップ。手が入る隙間がないことを見せる。',
          narration: null,
          caption: '置き場所、ありますか?',
          cameraNote: '固定、寄り。9:16なら被写体を上1/3に配置。',
        },
        {
          order: 2,
          startSec: Number(unit.toFixed(1)),
          endSec: Number((unit * 2).toFixed(1)),
          role: '商品登場',
          description: `${name}が白背景でゆっくり回転する。ロゴ面が正面を向いた状態で止まる。`,
          narration: `${name}。`,
          caption: '収納時150mm',
          cameraNote: '360度回転素材を使用',
        },
        {
          order: 3,
          startSec: Number((unit * 2).toFixed(1)),
          endSec: Number((unit * 3).toFixed(1)),
          role: '商品使用',
          description: '手で本体を折りたたみ、棚の下段にすっと収める一連の動作。',
          narration: 'たたんで、しまえる。',
          caption: 'たたんで、しまえる',
          cameraNote: '手元にフォーカス',
        },
        {
          order: 4,
          startSec: Number((unit * 3).toFixed(1)),
          endSec: Number((unit * 4).toFixed(1)),
          role: '結果',
          description: '整理された収納棚と、そこに収まっている商品。生活感のある明るい室内。',
          narration: null,
          caption: '洗えるから、清潔',
          cameraNote: '引き、自然光',
        },
        {
          order: 5,
          startSec: Number((unit * 4).toFixed(1)),
          endSec: input.durationSec,
          role: 'CTA',
          description: '白背景に商品正面カット、価格とブランド名を表示。',
          narration: null,
          caption: '詳しくはこちら',
          cameraNote: '静止画+テキストアニメーション',
        },
      ],
    }
  },
}
