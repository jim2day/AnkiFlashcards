import { Plugin } from "obsidian";
import { AnkiClient } from "./anki";
import {
	AnkiFlashcardsSettingTab,
	DEFAULT_SETTINGS,
	type AnkiFlashcardsSettings,
} from "./settings";
import { pingAnki, syncCurrentNote } from "./sync";

export default class AnkiFlashcardsPlugin extends Plugin {
	settings: AnkiFlashcardsSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addCommand({
			id: "sync-current-note",
			name: "Sync current note to Anki",
			callback: () => {
				void syncCurrentNote(this.app, this.settings, this.createAnkiClient());
			},
		});

		this.addCommand({
			id: "ping-ankiconnect",
			name: "Ping AnkiConnect",
			callback: () => {
				void pingAnki(this.createAnkiClient());
			},
		});

		this.addSettingTab(new AnkiFlashcardsSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<AnkiFlashcardsSettings> & {
			deleteBeforeSync?: boolean;
		} | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data) as AnkiFlashcardsSettings;
		if (data && data.deleteMissingCards === undefined && typeof data.deleteBeforeSync === "boolean") {
			this.settings.deleteMissingCards = data.deleteBeforeSync;
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private createAnkiClient(): AnkiClient {
		return new AnkiClient(this.settings.ankiConnectUrl);
	}
}
