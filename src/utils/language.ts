const languageMap: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  th: 'Thai'
}
export const sortedLocales = Object.keys(languageMap).sort((a, b) => {
  return languageMap[a].localeCompare(languageMap[b])
})
