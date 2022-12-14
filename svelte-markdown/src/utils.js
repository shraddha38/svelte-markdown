// string used as a fallback in case local storage doesn't have a saved value
const initialValue = `# Svelte Markdown Editor
## Put up your code here and see the magic
`;

// utility function returning the initial value for markdown
// using the value in local storage or the default value described above
export function getInitialValue() {
  return fromLocalStorage('markdown--string') || initialValue;
}

// utility function returning a value from local storage
function fromLocalStorage(key) {
  return localStorage.getItem(key);
}

// utility function storing the existing string of markup in local storage
export function toLocalStorage(string) {
  // sanitize the string with dompurify
  localStorage.setItem('markdown--string', DOMPurify.sanitize(string));
}