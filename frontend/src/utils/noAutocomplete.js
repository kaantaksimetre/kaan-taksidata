const sessionToken = (() => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
})();

/**
 * Chromium tabanli tarayicilarin daha once girilen alan degerlerini
 * musteri formlarinda oneri olarak gostermesini engeller.
 *
 * Rastgele name degeri eski tarayici gecmisiyle eslesmeyi keser.
 * data-field ise React state alanini guvenli bicimde korur.
 */
export function noAutocompleteProps(field) {
  return {
    name: `kaan_${field}_${sessionToken}`,
    'data-field': field,
    autoComplete: 'off',
    'aria-autocomplete': 'none',
    'data-lpignore': 'true',
    'data-1p-ignore': 'true',
    spellCheck: false,
  };
}
