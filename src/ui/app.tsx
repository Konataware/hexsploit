import { useState } from "react";
import { useGameStore } from "../game/store";
import {
  formatAddress,
  formatByte,
} from "../game/memory";

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percentage = Math.max(
    0,
    Math.min(100, (value / max) * 100),
  );

  return (
    <div className="stat">
      <div className="stat-heading">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>

      <div className="bar">
        <div
          className="bar-fill"
          style={{
            width: `${percentage}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const {
    player,
    enemy,
    enemyIndex,
    turn,
    ap,
    phase,
    score,
    memory,
    scanResults,
    selectedAddress,
    log,
    scan,
    selectAddress,
    edit,
    attack,
    endTurn,
    restart,
  } = useGameStore();

  const [searchValue, setSearchValue] = useState("40");
  const [editValue, setEditValue] = useState("10");

  const visibleStart = 0x3c;
  const visibleEnd = 0x5b;

  const selectedValue =
    selectedAddress === null
      ? null
      : memory[selectedAddress];

  function handleScan() {
    scan(Number(searchValue));
  }

  function handleEdit() {
    edit(Number(editValue));
  }

  return (
    <main className="game">
      <header className="topbar">
        <div>
          <h1>HEXploit</h1>
          <p>Memory Manipulation RPG</p>
        </div>

        <div className="run-info">
          <span>RUN SCORE: {score}</span>
          <span>TURN: {turn}</span>
          <span>AP: {ap}/3</span>
        </div>
      </header>

      {phase !== "battle" && (
        <section className="result-screen">
          <h2>
            {phase === "victory" ? "VITÓRIA!" : "DERROTA"}
          </h2>

          <p>
            {phase === "victory"
              ? "Todos os inimigos foram derrotados."
              : "O herói não conseguiu continuar."}
          </p>

          <p>Pontuação: {score}</p>

          <button onClick={restart}>
            Nova Run
          </button>
        </section>
      )}

      <section className="battle-panel">
        <div className="section-heading">
          <h2>Campo de Batalha</h2>
          <span>
            INIMIGO {enemyIndex + 1}/3
          </span>
        </div>

        <div className="combatants">
          <article className="combatant hero">
            <div className="character-art">
              <pre>{`  /\\
 /  \\
 |[]|
 /||\\
 /  \\`}</pre>
            </div>

            <h3>Herói</h3>

            <StatBar
              label="BUFFER"
              value={player.buffer}
              max={player.maxBuffer}
              color="#4d9cce"
            />

            <StatBar
              label="CORE"
              value={player.core}
              max={player.maxCore}
              color="#a94d42"
            />

            <div className="attributes">
              <span>ATK: {player.atk}</span>
              <span>DEF: {player.def}</span>
              <span>REGEN: {player.regen}</span>
            </div>
          </article>

          <div className="versus">VS</div>

          <article className="combatant enemy">
            <div className="character-art enemy-art">
              <pre>{enemy.symbol}</pre>
            </div>

            <h3>{enemy.name}</h3>
            <p className="enemy-description">
              {enemy.description}
            </p>

            <StatBar
              label="BUFFER"
              value={enemy.stats.buffer}
              max={enemy.stats.maxBuffer}
              color="#4d9cce"
            />

            <StatBar
              label="CORE"
              value={enemy.stats.core}
              max={enemy.stats.maxCore}
              color="#a94d42"
            />

            <div className="attributes">
              <span>ATK: {enemy.stats.atk}</span>
              <span>DEF: {enemy.stats.def}</span>
              <span>REGEN: {enemy.stats.regen}</span>
            </div>
          </article>
        </div>

        <div className="combat-actions">
          <button
            onClick={attack}
            disabled={phase !== "battle" || ap < 1}
          >
            ⚔ Attack — 1 AP
          </button>

          <button
            className="secondary"
            onClick={endTurn}
            disabled={phase !== "battle"}
          >
            Encerrar turno
          </button>
        </div>
      </section>

      <section className="memory-panel">
        <div className="section-heading">
          <div>
            <h2>Memory Grid</h2>
            <p>256 bytes · Endereços 0x00–0xFF</p>
          </div>

          <span className="grid-status">
            MEMORY ONLINE
          </span>
        </div>

        <div className="memory-controls">
          <div className="control-group">
            <label htmlFor="search-value">
              Exact Value Scan
            </label>

            <div className="input-row">
              <input
                id="search-value"
                type="number"
                min="0"
                max="255"
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(event.target.value)
                }
              />

              <button
                onClick={handleScan}
                disabled={ap < 1 || phase !== "battle"}
              >
                Scan — 1 AP
              </button>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="edit-value">
              Edit Selected Address
            </label>

            <div className="input-row">
              <input
                id="edit-value"
                type="number"
                min="0"
                max="255"
                value={editValue}
                onChange={(event) =>
                  setEditValue(event.target.value)
                }
              />

              <button
                onClick={handleEdit}
                disabled={
                  selectedAddress === null ||
                  ap < 1 ||
                  phase !== "battle"
                }
              >
                Edit — 1 AP
              </button>
            </div>
          </div>
        </div>

        <div className="scan-results">
          <div className="results-heading">
            <strong>Scan Results</strong>
            <span>{scanResults.length} resultado(s)</span>
          </div>

          {scanResults.length === 0 ? (
            <p className="empty">
              Nenhum resultado. Execute um Scan.
            </p>
          ) : (
            <div className="result-list">
              {scanResults.map((address) => (
                <button
                  key={address}
                  className={
                    selectedAddress === address
                      ? "result-chip selected"
                      : "result-chip"
                  }
                  onClick={() => selectAddress(address)}
                >
                  {formatAddress(address)}:
                  {" "}
                  {formatByte(memory[address])}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="selected-address">
          <span>ENDEREÇO SELECIONADO</span>

          <strong>
            {selectedAddress === null
              ? "Nenhum"
              : formatAddress(selectedAddress)}
          </strong>

          <span>VALOR ATUAL</span>

          <strong>
            {selectedValue === null
              ? "--"
              : `0x${formatByte(selectedValue)} (${selectedValue})`}
          </strong>
        </div>

        <div className="hex-grid">
          <div className="hex-header">
            <span>ADDR</span>

            {Array.from({ length: 16 }, (_, index) => (
              <span key={index}>
                {index.toString(16).toUpperCase()}
              </span>
            ))}
          </div>

          {Array.from(
            {
              length:
                Math.floor(visibleEnd / 16) -
                Math.floor(visibleStart / 16) +
                1,
            },
            (_, rowIndex) => {
              const rowAddress =
                Math.floor(visibleStart / 16) * 16 +
                rowIndex * 16;

              return (
                <div className="hex-row" key={rowAddress}>
                  <span className="row-address">
                    {rowAddress
                      .toString(16)
                      .toUpperCase()
                      .padStart(2, "0")}
                  </span>

                  {Array.from({ length: 16 }, (_, column) => {
                    const address = rowAddress + column;
                    const isSelected =
                      selectedAddress === address;
                    const isResult =
                      scanResults.includes(address);

                    return (
                      <button
                        key={address}
                        className={[
                          "hex-cell",
                          isSelected ? "selected" : "",
                          isResult ? "found" : "",
                        ].join(" ")}
                        onClick={() => selectAddress(address)}
                        title={formatAddress(address)}
                      >
                        {formatByte(memory[address])}
                      </button>
                    );
                  })}
                </div>
              );
            },
          )}
        </div>

        <p className="grid-hint">
          Selecione um endereço para editá-lo. Core é protegido.
        </p>
      </section>

      <section className="log-panel">
        <div className="section-heading">
          <h2>Event Log</h2>
          <span>COMBAT OUTPUT</span>
        </div>

        <div className="log-list">
          {log.slice(0, 8).map((entry) => (
            <p
              key={entry.id}
              className={`log-${entry.type}`}
            >
              {">"} {entry.text}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
