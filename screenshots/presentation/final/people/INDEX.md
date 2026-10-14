# People: final QA image set

Captured at 967d31d from the cast sheet (`sheet.html`) with `node tools/qa-captures.mjs <base> screenshots/presentation/final/people --part=sheet` and `--part=seated --prefix=people`, headless Chromium, device scale 1. The face and enlargement images are crops of those captures (PIL; enlargements are nearest-neighbour, so each source pixel is a square block). "Review light" is the sheet's neutral light. "Game light" is the game's lighting at the game's 68° FOV.

The eleven representatives, left to right: slim civilian, standard civilian, sturdy civilian, young mechanic, older mechanic, labourer, foundry worker, stallholder, shop merchant, garrison soldier, inspector.

## 1. Matrix (12)

- `matrix-01-front.png`: the eleven, front, standing idle, review light.
- `matrix-02-quarter.png`: the eleven, 3/4, standing idle, review light.
- `matrix-03-side.png`: the eleven, side, standing idle, review light.
- `matrix-04-back.png`: the eleven, back, standing idle, review light.
- `matrix-05-stride-front.png`: the eleven, front, walking stride at peak knee, review light.
- `matrix-06-stride-side.png`: the eleven, side, walking stride at peak knee, review light.
- `matrix-07-distance-50px.png`: the eleven at ~50 px tall, 3/4, standing idle, game light, true size.
- `matrix-07-distance-50px-x8.png`: the line-up from matrix-07, enlarged x8.
- `matrix-08-distance-mid.png`: the eleven at ~110 px tall, 3/4, standing idle, game light, true size.
- `matrix-08-distance-mid-x4.png`: the line-up from matrix-08, enlarged x4.
- `matrix-09-silhouette-front.png`: the eleven as solid silhouettes, front, standing idle.
- `matrix-10-silhouette-side.png`: the eleven as solid silhouettes, side, standing idle.

## 2. Seated (7)

Cast: the eleven, then the child and the elder. Review light; the red line is the pavement, and the bench sits under the hips.

- `people-seated-sit-side.png`: the thirteen seated, side.
- `people-seated-sit-front.png`: the thirteen seated, front.
- `people-seated-sit-quarter.png`: the thirteen seated, 3/4.
- `people-seated-bite-side.png`: the thirteen seated and eating, at the top of the bite, side.
- `people-seated-bite-front.png`: the thirteen seated and eating, at the top of the bite, front.
- `people-seated-bite-quarter.png`: the thirteen seated and eating, at the top of the bite, 3/4.
- `people-seated-sit-side-feet.png`: slim civilian, foundry worker, garrison soldier and the elder seated, side, close on the feet and the pavement.

## 3. Procedurality (10)

Seeds 0-19 of each street archetype, using the street's cast weights. Standing idle, review light. Each label gives the resolved look; `looks.json` holds all of them.

- `seeds-resident-front.png`: twenty residents, front.
- `seeds-resident-quarter.png`: twenty residents, 3/4.
- `seeds-worker-front.png`: twenty workers, front.
- `seeds-worker-quarter.png`: twenty workers, 3/4.
- `seeds-merchant-front.png`: twenty merchants, front.
- `seeds-merchant-quarter.png`: twenty merchants, 3/4.
- `seeds-courier-front.png`: twenty couriers, front.
- `seeds-courier-quarter.png`: twenty couriers, 3/4.
- `seeds-engineer-front.png`: twenty engineers, front.
- `seeds-engineer-quarter.png`: twenty engineers, 3/4.

## 4. Faces (6)

- `faces-01-front.png`: heads and shoulders of the eleven, front, review light, cropped from matrix-01 and enlarged x2.
- `faces-02-quarter.png`: heads and shoulders of the eleven, 3/4, review light, cropped from matrix-02 and enlarged x2.
- `faces-03-110px-game-light-x8.png`: heads of the eleven at ~110 px figure height, 3/4, game light, cropped from matrix-08 and enlarged x8.
- `faces-04-dark-skin-front.png`: every figure with the darkest skin tone (skin index 2) among the procedurality seeds, 28 in all across the five archetypes, full figure, front, review light.
- `faces-05-dark-skin-quarter.png`: the same 28 figures, full figure, 3/4, review light.
- `faces-06-dark-skin-heads-x4.png`: the same 28 figures, heads, front, review light, enlarged x4.

## 5. Intro figures (4)

Cast, left to right: introGuard (garrison, Ordinance), introOrdinal (inspector, Ordinance) and the masked stranger. Review light.

- `intro-figures-front.png`: the three, front, standing idle.
- `intro-figures-quarter.png`: the three, 3/4, standing idle.
- `intro-figures-side.png`: the three, side, standing idle.
- `intro-figures-sit.png`: the three seated, 3/4.

## Data

- `looks.json`: the resolved look of every procedurality figure (seed, cast, family, frame, outfit, palette, face type, head shape, skin, hat, hair).
- `foot-slide.json`: the sheet stride's foot-slide measure.
- `console.json`: the browser console for the sheet loads. Each run logged one 404, which was the favicon.
