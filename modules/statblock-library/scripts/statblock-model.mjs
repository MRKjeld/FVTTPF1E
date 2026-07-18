const { HTMLField, SchemaField, NumberField, BooleanField, StringField, ArrayField } = foundry.data.fields;

export class StatblockData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      cr: new NumberField({ label: "CR", required: true, initial: 1, min: 0, integer: false }),
      description: new HTMLField({ label: "Description", required: false, initial: "" }),
      appearance: new HTMLField({ label: "Appearance", required: false, initial: "" }),
      stats: new SchemaField({
        str: new NumberField({ label: "Strength", required: true, initial: 10, min: 0, integer: true, nullable: true }),
        dex: new NumberField({
          label: "Dexterity",
          required: true,
          initial: 10,
          min: 0,
          integer: true,
          nullable: true,
        }),
        con: new NumberField({
          label: "Constitution",
          required: true,
          initial: 10,
          min: 0,
          integer: true,
          nullable: true,
        }),
        int: new NumberField({
          label: "Intelligence",
          required: true,
          initial: 10,
          min: 0,
          integer: true,
          nullable: true,
        }),
        wis: new NumberField({ label: "Wisdom", required: true, initial: 10, min: 0, integer: true, nullable: true }),
        cha: new NumberField({ label: "Charisma", required: true, initial: 10, min: 0, integer: true, nullable: true }),
      }),
      hasSpellCasting: new BooleanField({ label: "Has Spell Casting", required: true, initial: false }),
      spellcastingKinds: new ArrayField("String", { label: "Spellcasting Kinds", required: false, initial: [] }),
      rawText: new HTMLField({ label: "Raw Text", required: false, initial: "" }),
    };
  }
}
