import React, { useState } from 'react';

export default function PantallaLogin({ onIniciarSesion }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);

  function agregarDigito(digito) {
    if (pin.length >= 6) return;
    setError('');
    setPin(pin + digito);
  }

  function borrarDigito() {
    setError('');
    setPin(pin.slice(0, -1));
  }

  async function confirmar() {
    if (pin.length === 0) {
      setError('Ingresa tu PIN primero');
      return;
    }
    setVerificando(true);
    const resultado = await window.pos.iniciarSesion(pin);
    setVerificando(false);

    if (!resultado.ok) {
      setError('PIN incorrecto');
      setPin('');
      return;
    }
    onIniciarSesion(resultado.usuario);
  }

  return (
    <div className="pantalla-login">
      <div className="tarjeta-login">
        <h1>POS Modular</h1>
        <p className="texto-tenue">Ingresa tu PIN para continuar</p>

        <div className="puntos-pin">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={`punto-pin ${i < pin.length ? 'lleno' : ''}`} />
          ))}
        </div>

        {error && <p className="texto-error">{error}</p>}

        <div className="teclado-numerico">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button key={n} className="tecla" onClick={() => agregarDigito(n)}>
              {n}
            </button>
          ))}
          <button className="tecla tecla-secundaria" onClick={borrarDigito}>
            <i className="ti ti-backspace" />
          </button>
          <button className="tecla" onClick={() => agregarDigito('0')}>
            0
          </button>
          <button className="tecla tecla-primaria" onClick={confirmar} disabled={verificando}>
            <i className="ti ti-check" />
          </button>
        </div>

        <p className="texto-tenue texto-ayuda">PIN de fábrica del administrador: 1234</p>
      </div>
    </div>
  );
}
