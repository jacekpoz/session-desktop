/* eslint-env node */
/* global log */

exports.setup = (locale, messages) => {
  if (!locale) {
    throw new Error('i18n: locale parameter is required');
  }
  if (!messages) {
    throw new Error('i18n: messages parameter is required');
  }

  function getMessage(key, substitutions) {
    const message = messages[key];
    if (!message) {
      log.error(`i18n: Attempted to get translation for nonexistent key '${key}'`);
      return '';
    }

    if (Array.isArray(substitutions)) {
      const replacedNameDollarSign = message.replaceAll('$', 'ￗ');

      const substituted = substitutions.reduce(
        (result, substitution) => result.replace(/ￗ.+?ￗ/, substitution),
        replacedNameDollarSign
      );

      return substituted.replaceAll('ￗ', '$');
    } else if (substitutions) {
      return message.replace(/\$.+?\$/, substitutions);
    }

    return message;
  }

  getMessage.getLocale = () => locale;

  return getMessage;
};
