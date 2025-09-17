// Force the app to always use light mode
export function forceLightMode() {
  // Remove dark class if it exists
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark')
  }

  // Clear any dark mode preference from localStorage
  localStorage.removeItem('dark-mode-preference')

  // Set light mode preference
  localStorage.setItem('dark-mode-preference', 'light')
}

export default forceLightMode
