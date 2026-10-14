# 레시피 이미지

공식 레시피와 드리퍼 기본 이미지는 imagen MCP(OpenAI GPT Image 2.5, `sunburst`)로 만든다.
사용자 레시피는 드리퍼 기본 이미지를 쓴다. 매핑은 `src/features/recipe/images.ts`.

## 생성 설정

- 4:3, 긴 변 1200px, webp(압축 80), quality high
- 저장: `public/images/recipes/<recipe-id>.webp`, `public/images/drippers/<slug>.webp`, `public/images/drippers/default.webp`
- 공식 레시피를 추가하면 같은 공통 프롬프트로 이미지를 만들고 `images.ts`의 목록에 id를 추가한다 (단위 테스트가 파일 존재를 확인한다).
- 드리퍼를 추가하면 드리퍼 이미지도 추가한다 (단위 테스트가 `seed.sql`의 slug마다 파일을 확인한다).

## 공통 프롬프트 (앞에 붙인다)

> Photorealistic editorial coffee photograph, 4:3 landscape. Warm soft natural window light, shallow depth of field, light oak wooden table, muted earthy palette of warm browns and cream. 45-degree camera angle, main subject centered with generous empty space on all sides so it can be cropped to a square or 16:9. No text, no letters, no logos, no brand marks, no people, no hands.

## 드리퍼 묘사

| slug | 묘사 |
| --- | --- |
| v60 | a clear glass cone-shaped pour-over dripper with spiral ribs inside and one large hole, white cone paper filter |
| kalita-wave | a brushed stainless steel flat-bottom pour-over dripper with a white fluted wave paper filter |
| origami | a matte ceramic pour-over dripper with twenty sharp vertical pleats, sitting in a round wooden holder |
| chemex | an hourglass-shaped glass coffee carafe with a wooden collar tied with a leather cord and a thick folded white paper filter in the top |
| melitta | a white ceramic wedge-shaped pour-over dripper with a flat bottom and a single small hole, white wedge paper filter |
| clever | a clear wedge-shaped immersion coffee dripper with a lid, coffee steeping inside |

## 장면

| 파일 | 장면 |
| --- | --- |
| drippers/v60 | {v60} on a glass server with brewed coffee, a small bowl of coffee beans nearby |
| drippers/kalita-wave | {kalita-wave} on a ceramic mug, a gooseneck kettle softly blurred behind |
| drippers/origami | white {origami} on a glass server, a few coffee beans scattered |
| drippers/chemex | {chemex} filled halfway with brewed coffee |
| drippers/melitta | {melitta} sitting on top of a stoneware mug |
| drippers/clever | {clever} next to an empty glass carafe |
| drippers/default | a white ceramic mug of black coffee on a saucer beside a small pile of roasted coffee beans |
| recipes/…01 V60 울티밋 | {v60} on a glass server, freshly brewed coffee, a slow stream of water pouring in from a gooseneck kettle spout at the top edge, morning light |
| recipes/…02 4:6 메소드 | {v60} on a glass server with coarsely ground coffee bloom, a digital scale underneath, a small bowl of whole beans |
| recipes/…03 V60 기본 1인분 | {v60} sitting directly on a simple white mug, minimal beginner setup, a paper bag of coffee beans in the background |
| recipes/…04 V60 라이트 로스트 | {v60} on a glass server with light amber coffee, a few small white flowers and a slice of citrus beside it, bright airy light |
| recipes/…05 칼리타 펄스 푸어 | {kalita-wave} on a glass server, a gooseneck kettle tilted mid-pour above it, coffee bed gently bubbling |
| recipes/…06 칼리타 3번 붓기 | {kalita-wave} on a ceramic mug on a breakfast table with a plate of toast, busy morning mood |
| recipes/…07 오리가미 콘 빠르게 | pale pink {origami} with a white cone paper filter on a slim glass server of clear light coffee |
| recipes/…08 오리가미 웨이브 밸런스 | sage green {origami} with a fluted wave filter on a glass server of medium-brown coffee, a few cookies on a small plate |
| recipes/…09 케멕스 기본 2인분 | {chemex} full of coffee with two small glass cups beside it |
| recipes/…10 케멕스 진하게 3인분 | {chemex} full of dark coffee with three mugs arranged around it on a wide table |
| recipes/…11 멜리타 클래식 | {melitta} on a heavy mug of dark rich coffee, a few dark roasted oily beans scattered, cozy dim light |
| recipes/…12 클레버 침지식 | {clever} sitting on a glass carafe, coffee draining from the bottom valve into the carafe |
| recipes/…13 V60 다크 로스트 | {v60} on a glass server of very dark coffee, a square of dark chocolate and dark roasted beans beside it, low warm light |
| recipes/…14 V60 한 번에 붓기 | {v60} on a mug, a gooseneck kettle resting beside it, simple calm composition |
| recipes/…15 칼리타 2인분 | {kalita-wave} on a large glass server with two mugs beside it |
| recipes/…16 칼리타 디카페인 | {kalita-wave} on a glass server, evening mood with a small lit candle and a book, warm lamp light |
| recipes/…17 오리가미 라이트 로스트 고온 | white {origami} on a glass server with steam rising from the coffee, a sprig of jasmine and a few light-roast beans |
| recipes/…18 케멕스 1인분 | {chemex} with a small amount of clear light coffee at the bottom and one glass cup beside it |
| recipes/…19 멜리타 라이트 | {melitta} on a light ceramic cup of lighter coffee, a few medium-roast beans, soft bright light |
| recipes/…20 클레버 2인분 | {clever} on a large glass carafe with two mugs nearby, coffee steeping |
| recipes/…21 클레버 산뜻하게 | {clever} on a glass carafe, a few orange slices and light-roast beans beside it, bright fresh light |
| recipes/…22 V60 1:17 클린컵 | {v60} on a glass server of bright clear amber coffee, a clean minimal white backdrop on the table |
