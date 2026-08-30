import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export interface AnkiFlashcardsSettings {
	ankiConnectUrl: string;
	deck: string;
	cardTag: string;
	includeHierarchy: boolean;
	hierarchySeparator: string;
	deleteBeforeSync: boolean;
}

export const DEFAULT_SETTINGS: AnkiFlashcardsSettings = {
	ankiConnectUrl: "http://127.0.0.1:8765",
	deck: "",
	cardTag: "#card",
	includeHierarchy: true,
	hierarchySeparator: " → ",
	deleteBeforeSync: true,
};

export interface AnkiFlashcardsPluginLike extends Plugin {
	settings: AnkiFlashcardsSettings;
	saveSettings(): Promise<void>;
}

export class AnkiFlashcardsSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: AnkiFlashcardsPluginLike,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Anki Flashcards" });

		containerEl.createEl("h3", { text: "Anki" });

		new Setting(containerEl)
			.setName("AnkiConnect URL")
			.setDesc("Usually http://127.0.0.1:8765")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.ankiConnectUrl)
					.setValue(this.plugin.settings.ankiConnectUrl)
					.onChange(async (value) => {
						this.plugin.settings.ankiConnectUrl = value.trim() || DEFAULT_SETTINGS.ankiConnectUrl;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Deck prefix")
			.setDesc(
				"Optional root deck. The rest comes from the note path, e.g. Civ Pro/Personal Jurisdiction.md → Civ Pro::Personal Jurisdiction.",
			)
			.addText((text) =>
				text
					.setPlaceholder("Leave empty to use the file path only")
					.setValue(this.plugin.settings.deck)
					.onChange(async (value) => {
						this.plugin.settings.deck = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h3", { text: "Card behavior" });

		new Setting(containerEl)
			.setName("Card tag")
			.setDesc("Heading token that marks a flashcard. Default is #card.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.cardTag)
					.setValue(this.plugin.settings.cardTag)
					.onChange(async (value) => {
						this.plugin.settings.cardTag = value.trim() || DEFAULT_SETTINGS.cardTag;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Include hierarchy")
			.setDesc("Prepend parent headings to the card front as one chain, and store them in Context.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeHierarchy).onChange(async (value) => {
					this.plugin.settings.includeHierarchy = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Hierarchy separator")
			.setDesc("Joins parent headings and the question on the card front.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.hierarchySeparator)
					.setValue(this.plugin.settings.hierarchySeparator)
					.onChange(async (value) => {
						this.plugin.settings.hierarchySeparator = value.length
							? value
							: DEFAULT_SETTINGS.hierarchySeparator;
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h3", { text: "Sync behavior" });

		new Setting(containerEl)
			.setName("Delete existing cards before sync")
			.setDesc(
				"Remove Anki notes tagged for this file before creating the current cards. Turning this off can create duplicates.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.deleteBeforeSync).onChange(async (value) => {
					this.plugin.settings.deleteBeforeSync = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
