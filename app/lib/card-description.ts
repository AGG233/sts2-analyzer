// 清理游戏源码中的模板语法，生成可显示的卡牌描述

templateRegex: {Var:diff()}/g, "X");
	// 移除能量前缀图标 {energyPrefix:energyIcons(N)}
	text = text.replace(/{energyPrefix:energyIcons\(\d+\)}/g, "");
	// 移除剩余的 {XXX:xxx()} 模板调用
	text = text.replace(/{\w+:\w+\([^)]*\)}/g, "X");
	// 移除无参数模板 {XXX}
	text = text.replace(/{\w+}/g, "X");
	// [gold]...[/gold] → 保留，后续由 CSS 高亮
	// [blue]...[/blue] → 保留
	// \n → 换行
	text = text.replace(/\\n/g, "\n");
	// 清理多余空格
	text = text.replace(/ +/g, " ").trim();
	return text;
}
