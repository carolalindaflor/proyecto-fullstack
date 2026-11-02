import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';

const Login = () => {
  const navigate = useNavigate();

  // Flujo secuencial estricto de Voke: 'Entrar', 'registro', o 'perfil'
  const [faseActual, setFaseActual] = useState('acceso');
  const [tipoDocumento, setTipoDocumento] = useState('CPF');

  // ESTADOS MAESTROS DE LOS CAMPOS
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [contrasenaAnterior, setContrasenaAnterior] = useState('');
  const [nombre, setNombre] = useState('');
  const [numDoc, setNumDoc] = useState('');
  const [fecha, setFecha] = useState('');
  const [sexo, setSexo] = useState('');
  const [tel, setTel] = useState('');

  // Canales de notificación opcionales
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifTel, setNotifTel] = useState(false);
  const [notifWhatsapp, setNotifWhatsapp] = useState(false);
  const [notifSms, setNotifSms] = useState(false);

  const [user, setUser] = useState(null);
  const [alerta, setAlerta] = useState({ txt: '', err: false });

  // 🔐 SINCRONIZACIÓN ESTRICTA DEL CRUD PROTEGIDA CONTRA BUCLES EN EL REGISTRO
  useEffect(() => {
    const guardado = localStorage.getItem('voke_usuario');
    const token = localStorage.getItem('voke_token');

    // ⚡ LÍNEA DE ESCAPE DEFINITIVA: Si no hay sesión activa, bloqueamos el useEffect de inmediato.
    // Esto permite que cambies a la fase de 'registro' libremente sin que el sistema te regrese a 'acceso'.
    if (!guardado || !token) {
      return; // Detiene la ejecución aquí y protege el formulario
    }

    const cargarPerfilCompleto = async () => {
      try {
        const u = JSON.parse(guardado);
        setUser(u);
        setEmail(u?.email || '');

        // Consulta relacional directa a tu tabla de usuarios o perfiles
        const response = await api.get(`/auth/usuario/${u.id}`);
        const datosBD = response.data?.usuario || response.data?.user || response.data;

        if (datosBD) {
          // Saneamos y pre-rellenamos los inputs con los datos reales de PostgreSQL
          setNombre(datosBD.nome_completo || datosBD.nombre || '');
          setTel(datosBD.telefono || datosBD.tel || datosBD.telefone || '');
          setNumDoc(datosBD.cpf_cnpj || '');
          setFecha(datosBD.fecha_nacimiento || '');
          setSexo(datosBD.sexo || '');
        }

        setFaseActual('perfil');
      } catch (e) {
        console.error('Error al traer perfil del CRUD local:', e);
        const u = JSON.parse(guardado);
        setNombre(u?.nome_completo || '');
        setFaseActual('perfil');
      }
    };

    cargarPerfilCompleto();
  }, [faseActual]);

  // ==========================================
  // FUNCIONES CONTROLADORAS DEL CRUD
  // ==========================================
  const ingresar = async (e) => {
    e.preventDefault();
    setAlerta({ txt: '', err: false });
    if (!email || !pass) return setAlerta({ txt: 'Por favor, insira e-mail e senha.', err: true });

    try {
      const response = await api.post('/auth/login', { email, contrasena: pass });
      const data = response.data;
      const usuarioValido = data.usuario || data.user || data;

      localStorage.setItem('voke_token', data.token);
      localStorage.setItem('voke_usuario', JSON.stringify(usuarioValido));

      setUser(usuarioValido);
      setNombre(usuarioValido?.nome_completo || usuarioValido?.nombre || '');
      setEmail(usuarioValido?.email || '');
      setTel(usuarioValido?.telefono || usuarioValido?.tel || '');

      setContrasenaAnterior('');
      setPass('');
      setConfPass('');

      window.dispatchEvent(new Event('carrito_actualizado'));

      if (usuarioValido?.perfil?.toLowerCase() === 'admin') {
        console.log('¡Credenciales de Administrador detectadas! Redirigiendo al Panel...');
        navigate('/admin/dashboard');
      } else {
        console.log('Credenciales de Cliente detectadas. Redirigiendo a la vitrina...');
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'E-mail ou senha incorretos.';
      setAlerta({ txt: msg, err: true });
    }
  };

  const registrar = async (e) => {
    e.preventDefault();
    setAlerta({ txt: '', err: false });

    if (!email || !pass || !numDoc || !nombre) {
      return setAlerta({ txt: 'Preencha nome, documento, e-mail e senha.', err: true });
    }

    if (pass !== confPass) {
      return setAlerta({ txt: 'As senhas não coincidem.', err: true });
    }

    try {
      const datos = {
        email,
        contrasena: pass,
        cpf_cnpj: numDoc,
        nome_completo: nombre,
        fecha_nacimiento: fecha || null,
        sexo: sexo || 'O',
        telefono: tel || null,
        perfil: 'cliente'
      };

      await api.post('/auth/register', datos);

      setUser(null);
      setContrasenaAnterior('');
      setPass('');
      setConfPass('');
      setFaseActual('acceso');
      setAlerta({ txt: 'Conta criada com sucesso. Entre com seu e-mail e senha.', err: false });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro ao realizar cadastro no sistema.';
      setAlerta({ txt: msg, err: true });
    }
  };

  const modificarDatosBasicos = async (e) => {
    e.preventDefault();
    setAlerta({ txt: '', err: false });

    try {
      const response = await api.put(`/auth/usuario/${user.id}`, {
        nome_completo: nombre,
        email,
        telefono: tel
      });

      const data = response.data;
      const usuarioActualizado = data.usuario || data.user || data;

      localStorage.setItem('voke_usuario', JSON.stringify(data.usuario));
      setUser(usuarioActualizado);
      setAlerta({ txt: 'Dados pessoais atualizados com sucesso!', err: false });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro ao atualizar dados cadastrais.';
      setAlerta({ txt: msg, err: true });
    }
  };

  const modificarContrasena = async (e) => {
    e.preventDefault();
    setAlerta({ txt: '', err: false });

    if (!contrasenaAnterior || !pass) {
      return setAlerta({ txt: 'A senha anterior e a nova senha são obrigatórias.', err: true });
    }

    try {
      await api.put(`/auth/usuario/password/${user.id}`, {
        contrasenaAnterior,
        nuevaContrasena: pass
      });

      setAlerta({ txt: 'Senha alterada com sucesso!', err: false });
      setContrasenaAnterior('');
      setPass('');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Senha anterior incorreta. Verifique os dados.';
      setAlerta({ txt: msg, err: true });
    }
  };

  const eliminar = async () => {
    if (window.confirm('Deseja excluir permanentemente sua conta da Voke? Esta ação executará o método DELETE do CRUD.')) {
      try {
        await api.delete(`/auth/usuario/${user.id}`);

        localStorage.clear();
        setUser(null);
        setEmail('');
        setPass('');
        setNombre('');
        setTel('');
        window.dispatchEvent(new Event('carrito_actualizado'));
        setFaseActual('acceso');
        navigate('/');
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Erro ao deletar usuário do banco de dados.';
        setAlerta({ txt: msg, err: true });
      }
    }
  };

  // ==========================================
  // RENDERIZADO VISUAL DEL COMPONENTE
  // ==========================================
  return (
    <div className="voke-login-card-box">
     <div className="voke-logo-header">
  <Link to="/" className="voke-logo-image-link">
    <img
      src={`${import.meta.env.BASE_URL}logo-login.jpeg`}
      alt="Logotipo Voke Brasil"
      className="voke-login-logo-image"
    />
  </Link>
</div>
       {faseActual === 'acceso' && !user && (
        <div className="voke-form-title-block">
          <h2 className="voke-form-title-text">
            Bem-vindo(a) à Voke Brasil!
          </h2>

          <p className="voke-form-subtitle-text">
            Entre na sua conta para aproveitar nossas ofertas.
          </p>
        </div>
      )}

      {alerta.txt && (
        <div className={`voke-alerta-box ${alerta.err ? 'voke-alerta-error' : 'voke-alerta-success'}`}>
          {alerta.txt}
        </div>
      )}

      {/* --- FASE 1: ACCESO --- */}
      {faseActual === 'acceso' && (
        <div>
          {!user ? (
            <form onSubmit={ingresar}>
              <div className="voke-form-title-block">
                <h3 className="voke-form-title-text">Entrar</h3>
            <p className="voke-form-subtitle-text">Já é cliente da Voke?</p>
              </div>

              <div className="voke-form-group-block">
                <label className="voke-form-label">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Digite seu e-mail" className="voke-form-input-text" />
              </div>

              <div className="voke-form-group-block">
                <label className="voke-form-label">Senha</label>
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Digite sua senha" className="voke-form-input-text" />
              </div>

              <button type="submit" className="voke-submit-btn-black">Entrar</button>

              <div className="voke-login-footer-info">
                <p className="voke-form-subtitle-text">Ainda não tem uma conta na Voke?</p>
                <button
                  type="button"
                  onClick={() => setFaseActual('registro')}
                  className="voke-login-link-blue"
                >
                  Criar uma conta
                </button>
                <Link to="/" className="voke-login-link-blue voke-login-link-block">
                  Continuar navegando sem entrar
                </Link>
              </div>

              <div className="voke-logo-header-forgot">
                <span className="voke-login-link-blue-small">Esqueceu sua senha?</span>
              </div>
            </form>
          ) : (
            <div className="voke-sesion-activa-block">
              <div className="voke-form-title-block">
                <h3 className="voke-form-title-text">Olá, {nombre || 'Cliente'}</h3>
                <p className="voke-form-subtitle-text">Você já está autenticado no sistema da Voke.</p>
              </div>

              <button onClick={() => navigate('/')} className="voke-submit-btn-black">
                Ir às Compras (Ver Produtos)
              </button>

              <div className="voke-login-footer-info voke-login-footer-centered">
                <p className="voke-form-subtitle-text">¿Deseja atualizar seu perfil ou senha?</p>
                <button
                  type="button"
                  onClick={() => setFaseActual('perfil')}
                  className="voke-login-link-blue voke-login-link-block"
                >
                  Alterar meus dados cadastrais
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- FASE 2: REGISTRO EXTENDIDO --- */}
      {faseActual === 'registro' && !user && (
        <form onSubmit={registrar}>
          <div className="voke-form-title-block">
            <h3 className="voke-form-title-text">Criar uma conta</h3>
          </div>

          <div className="voke-radio-group">
            <label className="voke-radio-label">
              <input type="radio" checked={tipoDocumento === 'CPF'} onChange={() => setTipoDocumento('CPF')} /> CPF
            </label>
            <label className="voke-radio-label">
              <input type="radio" checked={tipoDocumento === 'CNPJ'} onChange={() => setTipoDocumento('CNPJ')} /> CNPJ
            </label>
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">{tipoDocumento}</label>
            <input type="text" value={numDoc} onChange={(e) => setNumDoc(e.target.value)} placeholder="000.000.000-00" className="voke-form-input-text" required />
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">Nome completo</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Digite seu nome completo." className="voke-form-input-text" required />
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">Data de nascimento</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="voke-form-input-text" />
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">Sexo</label>
            <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="voke-form-input-text">
              <option value="">Sexo</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">Telefone</label>
            <input type="text" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="(00) 0000 0000" className="voke-form-input-text" />
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Digite seu melhor endereço de e-mail." className="voke-form-input-text" required />
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">Senha</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Digite sua senha." className="voke-form-input-text" required />
          </div>

            <div className="voke-Dicas de segurança-box">
              <p className="voke-form-label">:Dicas de segurança</p>
              <p className="voke-Dicas de segurança-desc">Evite usar dados pessoais ou senhas que você já utiliza na Voke ou em outros sites.</p>
              <ul className="voke-Dicas de segurança-list">
                <li>•No mínimo 8 caracteres </li>
                <li>• Letras maiúsculas e minúsculas  (A/a)</li>
                <li>• Pelo menos um número (148)</li>
                <li>• Caracteres especiais (@\$#)</li>
                <li>• (Não utilize sequências previsíveis 123/Abc)</li>
              </ul>
            </div>

            <div className="voke-form-group-block-spaced">
              <label className="voke-form-label">Confirmar senha</label>
              <input type="password" value={confPass} onChange={(e) => setConfPass(e.target.value)} placeholder="Digite novamente a senha." className="voke-form-input-text" required />
            </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">Canales de notificación (opcional)</label>
            <p className="voke-notif-subtext">Selecione os canais pelos quais deseja receber notificações da Voke.</p>
            <div className="voke-notif-list">
              <label className="voke-notif-label"><input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} /> E-mail</label>
              <label className="voke-notif-label"><input type="checkbox" checked={notifTel} onChange={(e) => setNotifTel(e.target.checked)} /> Telefone</label>
              <label className="voke-notif-label"><input type="checkbox" checked={notifWhatsapp} onChange={(e) => setNotifWhatsapp(e.target.checked)} /> WhatsApp</label>
              <label className="voke-notif-label"><input type="checkbox" checked={notifSms} onChange={(e) => setNotifSms(e.target.checked)} /> SMS</label>
            </div>
          </div>

          <div className="voke-buttons-flex">
            <button type="button" onClick={() => setFaseActual('acceso')} className="voke-btn-"Voltar>Volver</button>
            <button type="submit" className="voke-btn-continuar">Continuar com o cadastro</button>
          </div>
        </form>
      )}

      {/* --- FASE 3: DADOS DO CLIENTE (PANEL CRUD POST-REGISTRO O LOGIN) --- */}
      {faseActual === 'perfil' && user && (
        <div className="voke-perfil-container">
          <div className="voke-profile-return-wrapper">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="voke-submit-btn-black voke-btn-return-full"
            >
              Voltar para a Loja (Ver Produtos)
            </button>
          </div>

          <form onSubmit={modificarDatosBasicos} className="voke-profile-section-form">
            <div className="voke-form-title-block">
              <h3 className="voke-form-title-text-profile">Dados do Cliente</h3>
              <p className="voke-form-subtitle-text">Atualize seus dados cadastrais aqui.</p>
            </div>

            <div className="voke-form-group-block">
              <label className="voke-form-label">Nome Completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="voke-form-input-text" />
            </div>

            <div className="voke-form-group-block">
              <label className="voke-form-label">E-mail</label>
              <input type="email" value={email} className="voke-form-input-text" disabled />
            </div>

            <div className="voke-form-group-block">
              <label className="voke-form-label">Telefone</label>
              <input type="text" value={tel} onChange={(e) => setTel(e.target.value)} className="voke-form-input-text" />
            </div>

            <button type="submit" className="voke-btn-salvar-datos">
              Alterar senha (PUT Datos)
            </button>
          </form>

          <form onSubmit={modificarContrasena} className="voke-profile-section-form-spaced">
            <div className="voke-form-title-block">
              <h4 className="voke-form-title-subsegment">Alterar Senha de Acesso</h4>
            </div>

            <div className="voke-form-group-block">
              <label className="voke-form-label">Nova Senha</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Digite nova senha" className="voke-form-input-text" />
            </div>

            <div className="voke-form-group-block voke-crud-seguridad-box">
              <label className="voke-form-label-alert">Senha Anterior (Obrigatório para alterar senha) *</label>
              <input type="password" value={contrasenaAnterior} onChange={(e) => setContrasenaAnterior(e.target.value)} placeholder="Digite sua senha atual para validar" className="voke-form-input-text" />
            </div>

            <button type="submit" className="voke-btn-salvar-clave">
              Alterar Senha (PUT Clave)
            </button>
          </form>

          <div className="voke-profile-delete-zone">
            <p className="voke-delete-warning-text">Deseja excluir sua conta permanentemente?</p>
            <button type="button" onClick={eliminar} className="voke-btn-eliminar">
              Excluir Conta (DELETE)
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.clear();

                if (typeof setUser === 'function') {
                  setUser(null);
                }

                window.dispatchEvent(new Event('carrito_actualizado'));
                setFaseActual('acceso');
                navigate('/');
              }}
              className="voke-btn-volver voke-btn-logout-full"
            >
              Sair da Conta (Logout)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;