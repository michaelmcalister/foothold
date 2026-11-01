// Holds the response from the last saved activity so the result screen can
// show exactly what changed (claimed, taken, battles) without refetching.
let last = null
export const setLastResult = (r) => { last = r }
export const lastResult = (id) => (last && last.activity.id === id ? last : null)
