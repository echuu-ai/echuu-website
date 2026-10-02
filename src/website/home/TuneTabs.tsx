const TABS = [['seam', '切口'], ['logo', 'Logo'], ['grade', '3D 调色']] as const;

/** 开发用调节面板顶部的切换按钮：改地址里的 ?tune= 后刷新（各面板的数值都存在本机，切换不会丢） */
export function TuneTabs({ active }: { active: (typeof TABS)[number][0] }) {
  const go = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tune', tab);
    window.location.assign(url.toString());
  };
  return (
    <div className="seam-tune__tabs">
      {TABS.map(([key, label]) => (
        <button key={key} type="button" data-active={key === active || undefined} onClick={() => key !== active && go(key)}>{label}</button>
      ))}
    </div>
  );
}
