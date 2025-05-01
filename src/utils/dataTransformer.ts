/**
 * Utilitaires pour transformer les données
 */

/**
 * S'assure que les champs requis sont présents dans les données
 * @param data Données à vérifier
 * @param requiredFields Liste des champs requis
 * @param defaultValues Valeurs par défaut pour les champs manquants
 */
export const ensureRequiredFields = (
  data: any,
  requiredFields: string[],
  defaultValues: Record<string, any> = {}
): any => {
  const result = { ...data };
  
  for (const field of requiredFields) {
    if (result[field] === undefined) {
      // Vérifier si le champ existe avec une première lettre majuscule
      const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
      if (result[capitalizedField] !== undefined) {
        result[field] = result[capitalizedField];
      } else if (defaultValues[field] !== undefined) {
        result[field] = defaultValues[field];
      }
    }
  }
  
  return result;
};

export default {
  ensureRequiredFields
}; 