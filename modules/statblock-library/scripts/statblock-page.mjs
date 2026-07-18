/**
 * The Application responsible for displaying and editing a single JournalEntryPage text document.
 *
 * @augments {JournalPageSheet}
 */
// export class JournalStatblockPageSheet extends JournalTextPageSheet {
// //   /** @inheritdoc */
// //   get template() {
// //     return `templates/journal/page-${this.document.type}-${this.isEditable ? "edit" : "view"}.html`;
// //   }

// }

// eslint-disable-next-line no-undef
export class JournalStatblockPageSheet extends JournalPageSheet {
  /**
   * Bi-directional HTML <-> Markdown converter.
   *
   * @type {showdown.Converter}
   * @protected
   */
  static _converter = (() => {
    Object.entries(CONST.SHOWDOWN_OPTIONS).forEach(([k, v]) => showdown.setOption(k, v));
    return new showdown.Converter();
  })();

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return `modules/statblock-library/templates/page-${this.document.type}-${this.isEditable ? "edit" : "view"}.html`;
  }

  /**
   * Declare the format that we edit text content in for this sheet so we can perform conversions as necessary.
   *
   * @type {number}
   */
  static get format() {
    return CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("statblock");
    options.secrets.push({ parentSelector: "section" });
    return options;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".importStatblock").click(this.importStatblock.bind(this));
  }

  async importStatblock(event) {
    event.preventDefault();
    const name = this.document.name;
    let content = this.document.text.content;

    // Grab the html and get some processed text from it.
    const node = document.createElement("div");
    node.innerHTML = content.replace(/<\/p>/g, "</p>\n\n").replace(/<hr\s*\/>/gi, "<hr />\n\n");
    content = node.innerText;
    node.remove();

    if (game.modules.get("pf1-statblock-converter").active) {
      const formInput = `${name}\n${content}`;
      const api = game.modules.get("pf1-statblock-converter").api?.openSBCDialog;
      if (!api) {
        ui.notifications.warn(
          'There is a new version of "Pathfinder 1e Statblock Converter (SBC)". Please update for better results.'
        );
        const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        window.$("#startSBCButton")[0].click();

        await wait(500);

        window.$("#sbcInput")[0].value = formInput;
        window.$("#sbcInput").keyup();
      } else {
        await api(formInput, this.object.uuid);
      }
    } else {
      ui.notifications.warn(
        'Please install and enable "Pathfinder 1e Statblock Converter (SBC)" to import this statblock'
      );
    }
  }

  /* -------------------------------------------- */

  /**
   * The table of contents for this JournalTextPageSheet.
   *
   * @type {[string: JournalEntryPageHeading]}
   */
  toc = {};

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options = {}) {
    const data = super.getData(options);
    this._convertFormats(data);
    data.editor = {
      engine: "prosemirror",
      collaborate: true,
      content: await TextEditor.enrichHTML(data.document.text.content, {
        relativeTo: this.object,
        secrets: this.object.isOwner,
        async: true,
      }),
    };
    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options = {}) {
    Object.values(this.editors).forEach((ed) => {
      if (ed.instance) ed.instance.destroy();
    });
    return super.close(options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _render(force, options) {
    // Suppress renders if we are in edit mode to avoid losing work. The collaborative editing workflow will take care
    // of updating editor state.
    const alreadyOpen = this._state === Application.RENDER_STATES.RENDERED;
    if (!options.resync && this.isEditable && alreadyOpen) return this.bringToTop();
    return super._render(force, options);
  }

  /* -------------------------------------------- */

  /**
   * Determine if any editors are dirty.
   *
   * @returns {boolean} True if any editor is dirty.
   */
  isEditorDirty() {
    for (const editor of Object.values(this.editors)) {
      if (editor.instance?.isDirty()) return true;
    }
    return false;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async activateEditor(name, options = {}, initialContent = "") {
    options.relativeLinks = true;
    return super.activateEditor(name, options, initialContent);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _renderInner(...args) {
    const html = await super._renderInner(...args);
    this.toc = JournalEntryPage.implementation.buildTOC(html.get());
    return html;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  // eslint-disable-next-line no-unused-vars
  _getSecretContent(secret) {
    return this.object.text.content;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateSecret(secret, content) {
    return this.object.update({ "text.content": content });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    if (this.constructor.format === CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML && this.isEditorDirty()) {
      // Clear any stored markdown so it can be re-converted.
      formData["text.markdown"] = "";
      formData["text.format"] = CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML;
    }
    return super._updateObject(event, formData);
  }

  /* -------------------------------------------- */

  /**
   * Lazily convert text formats if we detect the document being saved in a different format.
   *
   * @param {object} renderData  Render data.
   * @protected
   */
  _convertFormats(renderData) {
    const formats = CONST.JOURNAL_ENTRY_PAGE_FORMATS;
    const text = this.object.text;
    if (this.constructor.format === formats.MARKDOWN && text.content?.length && !text.markdown?.length) {
      // We've opened an HTML document in a markdown editor, so we need to convert the HTML to markdown for editing.
      renderData.data.text.markdown = this.constructor._converter.makeMarkdown(text.content.trim());
    }
  }

  /* -------------------------------------------- */

  /**
   * Update the parent sheet if it is open when the server autosaves the contents of this editor.
   *
   * @param {string} html  The updated editor contents.
   */
  // eslint-disable-next-line no-unused-vars
  onAutosave(html) {
    this.object.parent?.sheet?.render(false);
  }

  /* -------------------------------------------- */
  /*  HTML Editing                                */
  /* -------------------------------------------- */

  /**
   * Update the UI appropriately when receiving new steps from another client.
   */
  onNewSteps() {
    this.form.querySelectorAll('[data-action="save-html"]').forEach((el) => (el.disabled = true));
  }
}
