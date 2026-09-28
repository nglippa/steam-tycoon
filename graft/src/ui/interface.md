# src/ui/interface.ts

- Interface · class · L6-L72 — class Interface
- constructor · method · L9-L22 — constructor(public economy: Economy, public player: Player, public city: City, public sound: Soundscape)
- start · method · L23-L23 — start()
- toast · method · L24-L24 — toast(message: string, duration = 4500)
- openLedger · method · L25-L25 — openLedger(tab = this.tab)
- interact · method · L26-L26 — interact(t: Target)
- close · method · L27-L27 — close(resume = false)
- action · method · L28-L42 — action(action: string, id: string)
- button · method · L43-L43 — button(action: string, id: string, label: string, cost?: number, extraDisabled = false)
- render · method · L44-L65 — render()
- update · method · L66-L71 — update(weather: string, fps: number, debug: boolean)
