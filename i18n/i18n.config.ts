import de from "../app/locales/de.json";
import en from "../app/locales/en.json";
import es from "../app/locales/es.json";
import fr from "../app/locales/fr.json";
import it from "../app/locales/it.json";
import ja from "../app/locales/ja.json";
import ko from "../app/locales/ko.json";
import pl from "../app/locales/pl.json";
import pt from "../app/locales/pt.json";
import ru from "../app/locales/ru.json";
import th from "../app/locales/th.json";
import tr from "../app/locales/tr.json";
import zh from "../app/locales/zh.json";

export default defineI18nConfig(() => ({
	legacy: false,
	locale: "en",
	fallbackLocale: "en",
	messages: {
		en,
		zh,
		ja,
		ko,
		de,
		fr,
		es,
		it,
		pl,
		pt,
		ru,
		tr,
		th,
	},
}));
