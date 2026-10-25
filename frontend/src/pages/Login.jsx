import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  
  // Flujo secuencial estricto de Voke: 'acceso', 'registro', o 'perfil'
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
          console.error("Error al traer perfil del CRUD local:", e);
          const u = JSON.parse(guardado);
          setNombre(u?.nome_completo || '');
          setFaseActual('perfil');
      }
    };

    cargarPerfilCompleto();

  // 🚀 MANTENEMOS TU DEPENDÈNCIA ORIGINAL: Sincroniza el CRUD tras cada guardado (PUT)
  }, [faseActual]); 

  // Sincronización estricta al cargar el componente
  //   useEffect(() => {
  //   const cargarPerfilCompleto = async () => {
  //   const guardado = localStorage.getItem('voke_usuario');
  //   const token = localStorage.getItem('voke_token');
    
  //   if (guardado && token) {
  //     try {
  //       const u = JSON.parse(guardado);
  //       setUser(u);
  //       setEmail(u?.email || '');
  //         const response = await api.get(`/auth/usuario/${u.id}`);
  //         const datosBD = response.data?.usuario || response.data?.user || response.data;
          
  //         if (datosBD) {
  //           // Saneamos y pre-rellenamos los inputs con los datos reales de PostgreSQL
  //           setNombre(datosBD.nome_completo || datosBD.nombre || '');
  //           setTel(datosBD.telefono || datosBD.tel || datosBD.telefone || '');
  //           setNumDoc(datosBD.cpf_cnpj || '');
  //           setFecha(datosBD.fecha_nacimiento || '');
  //           setSexo(datosBD.sexo || '');
  //         }
  //         setFaseActual('perfil'); 
  //     } catch (e) {
  //         console.error("Error al traer perfil del CRUD local:", e);
  //         // Si hay algún problema, dejamos los datos base informativos para no romper la pantalla
  //         const u = JSON.parse(guardado);
  //         setNombre(u?.nome_completo || '');
  //         setFaseActual('perfil');
  //     }
  //   } else {
  //     setUser(null);
  //     setFaseActual('acceso'); 
  //   }
  // };
  // cargarPerfilCompleto();
  // }, [faseActual]);


  // ==========================================
  // FUNCIONES CONTROLADORAS DEL CRUD
  // ==========================================
    const ingresar = async (e) => {
    e.preventDefault();
    setAlerta({ txt: '', err: false });
    if (!email || !pass) return setAlerta({ txt: 'Por favor, insira e-mail e senha.', err: true });
    
    try {
      // 🚀 LLAMADA SEGURA CON INSTANCIA DE AXIOS
      const response = await api.post('/auth/login', { email, contrasena: pass });
      const data = response.data;

      // ⚡ DETECTOR Y BLINDAJE DE ESTRUCTURA DATA:
      // Evaluamos de forma flexible dónde empaquetó el backend el objeto del usuario
      const usuarioValido = data.usuario || data.user || data;

      localStorage.setItem('voke_token', data.token);
      localStorage.setItem('voke_usuario', JSON.stringify(usuarioValido));
      
      // Seteamos los estados usando variables seguras protegidas contra undefined
      setUser(usuarioValido);
      setNombre(usuarioValido?.nome_completo || usuarioValido?.nombre || '');
      setEmail(usuarioValido?.email || '');
      setTel(usuarioValido?.telefono || usuarioValido?.tel || '');
      
      setContrasenaAnterior('');
      setPass('');
      setConfPass('');
      
      window.dispatchEvent(new Event('carrito_actualizado'));
      
      // Redirige de inmediato al catálogo principal a comprar ya logueado

   //   navigate('/'); 
      // 🚀 REDIRECCIÓN INTELIGENTE DE PRODUCCIÓN BASADA EN EL ROL DE POSTGRESQL
      // Evaluamos el perfil real que devolvió tu controlador de Node.js en Render
      if (usuarioValido?.perfil?.toLowerCase() === 'admin') {
        console.log("¡Credenciales de Administrador detectadas! Redirigiendo al Panel...");
        navigate('/admin/dashboard'); // 📊 Si eres admin, te abre el Dashboard al instante
      } else {
        console.log("Credenciales de Cliente detectadas. Redirigiendo a la vitrina...");
        navigate('/'); // 🛍️ Si eres cliente común, te manda a comprar laptops
      }
    } catch (err) {
      // Captura de forma correcta tanto errores de validación como fallos de red
      const msg = err.response?.data?.error || err.message || 'E-mail ou senha incorretos.';
      setAlerta({ txt: msg, err: true });
    }
  };

  const registrar = async (e) => {
    e.preventDefault();
    setAlerta({ txt: '', err: false });
    if (!email || !pass || !numDoc || !nombre) {
      return setAlerta({ txt: 'Completa nombre, documento, correo y contraseña.', err: true });
    }
    if (pass !== confPass) return setAlerta({ txt: 'Las contraseñas no coinciden.', err: true });
    
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
      
      // 🚀 MIGRADO A AXIOS: Petición directa y adaptativa
      await api.post('/auth/register', datos);

      // El registro crea la cuenta, pero la sesión se inicia mediante el formulario de acceso.
      setUser(null);
      setContrasenaAnterior('');
      setPass('');
      setConfPass('');
      setFaseActual('acceso');
      setAlerta({ txt: 'Cuenta creada correctamente. Inicia sesión con tu correo y contraseña.', err: false });
    } catch (err) {
      // Captura el error real del controlador de Node.js
      const msg = err.response?.data?.error || err.message || 'Erro ao realizar cadastro no sistema.';
      setAlerta({ txt: msg, err: true });
    }
  };

  const modificarDatosBasicos = async (e) => {
    e.preventDefault();
    setAlerta({ txt: '', err: false });
    try {
      // 🚀 MIGRADO A AXIOS (PUT): Envía los campos de perfil
      const response = await api.put(`/auth/usuario/${user.id}`, { 
        nome_completo: nombre, 
        email, 
        telefono: tel 
      });
      const data = response.data;
      // Determinamos de forma flexible dónde empaquetó el backend el objeto del usuario
      const usuarioActualizado = data.usuario || data.user || data;

      localStorage.setItem('voke_usuario', JSON.stringify(data.usuario));
           
      // 🚀 LÍNEA CLAVE: Actualiza el estado en la RAM para que las casillas se queden llenas al instante
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
      // 🚀 MIGRADO A AXIOS (PUT): Envía las contraseñas para actualización
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
    if (window.confirm("Deseja excluir permanentemente sua conta da Voke? Esta ação executará o método DELETE do CRUD.")) {
      try {
        // 🚀 MIGRADO A AXIOS (DELETE): Ejecuta la remoción total del usuario en PostgreSQL
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
          src="/logo-voke.jpeg"
          alt="Logotipo Voke Brasil"
          className="voke-login-logo-image"/>
          </Link>
        <p className="voke-logo-sub">Simulação Loja Brasil</p>
         </div>
        {/* 🕵️‍♂️ LÍNEA DE DEPURACIÓN TEMPORAL DE DATOS (ELIMINAR AL FINAL) */}
         {/* <pre style={{ fontSize: '10px', background: '#eee', padding: '10px', overflowX: 'auto', color: 'black' }}>
          {JSON.stringify(user, null, 2)}
        </pre>  */}


        {alerta.txt && (
          <div className={`voke-alerta-box ${alerta.err ? 'voke-alerta-error' : 'voke-alerta-success'}`}>
            {alerta.txt}
          </div>
        )}

        {/* --- FASE 1: ACCESO --- */}
        {faseActual === 'acceso' && (
          <div>
            {!user ? (
              /* SI NO ESTÁ LOGUEADO: Muestra el formulario tradicional de email y clave */
              <form onSubmit={ingresar}>
                <div className="voke-form-title-block">
                  <h3 className="voke-form-title-text">Acceso</h3>
                  <p className="voke-form-subtitle-text">¿Ya eres cliente de Voke?</p>
                </div>
                
                <div className="voke-form-group-block">
                  <label className="voke-form-label">Correo electrónico</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Introduce tu dirección de correo" className="voke-form-input-text" />
                </div>
                
                <div className="voke-form-group-block">
                  <label className="voke-form-label">Contraseña</label>
                  <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Introduce tu contraseña" className="voke-form-input-text" />
                </div>
                
                <button type="submit" className="voke-submit-btn-black">Para entrar</button>
                
                <div className="voke-login-footer-info">
                  {/* <p className="voke-form-label">Crear una cuenta</p> */}
                  <p className="voke-form-subtitle-text">¿Aún no tienes una cuenta de Voke?</p>
                  <button 
                    type="button" 
                    onClick={() => setFaseActual('registro')} 
                    className="voke-login-link-blue"
                  >Registrar una Cuenta</button>
                  <Link to="/" className="voke-login-link-blue voke-login-link-block">
                    Continuar explorando sin iniciar sesión
                  </Link>
                  {/* <span onClick={() => setFaseActual('registro')} className="voke-login-link-blue">Registro</span> */}
                </div>
                
                <div className="voke-logo-header-forgot">
                  <span className="voke-login-link-blue-small">¿Esqueceu sua senha?</span>
                </div>
              </form>
            ) : (
              /* SI YA INICIÓ SESIÓN: Le da la bienvenida y le permite elegir su acción */
              <div className="voke-sesion-activa-block">
                <div className="voke-form-title-block">
                  <h3 className="voke-form-title-text">Olá, {nombre || 'Cliente'}</h3>
                  <p className="voke-form-subtitle-text">Você já está autenticado no sistema da Voke.</p>
                </div>

                <button onClick={() => navigate('/')} className="voke-submit-btn-black">
                  Ir às Compras (Ver Produtos)
                </button>

                {/* MIGRACIÓN DE ESTILOS: Se añade la nueva clase css voke-login-footer-centered */}
                <div className="voke-login-footer-info voke-login-footer-centered">
                  <p className="voke-form-subtitle-text">¿Deseja atualizar seu perfil ou senha?</p>
                  <button 
                    type="button" 
                    onClick={() => setFaseActual('perfil')} 
                    className="voke-login-link-blue voke-login-link-block"
                  >
                    Alterar meus dados cadastrais
                  </button>
                  {/* <span onClick={() => setFaseActual('perfil')} className="voke-login-link-blue voke-login-link-block">
                    Alterar meus dados cadastrais
                  </span> */}
                </div>
              </div>
            )}
          </div>
        )}
        {/* --- FASE 2: REGISTRO EXTENDIDO --- */}
        {faseActual === 'registro' && !user && (
          <form onSubmit={registrar}>
            <div className="voke-form-title-block">
              <h3 className="voke-form-title-text">Crear una cuenta</h3>
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
              <label className="voke-form-label">Nombre completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Escribe tu nombre." className="voke-form-input-text" required />
            </div>
            
            <div className="voke-form-group-block">
              <label className="voke-form-label">Fecha de nacimiento</label>
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
              <label className="voke-form-label">Teléfono</label>
              <input type="text" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="(00) 0000 0000" className="voke-form-input-text" />
            </div>
            
            <div className="voke-form-group-block">
              <label className="voke-form-label">Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Introduce tu mejor dirección de correo electrónico." className="voke-form-input-text" required />
            </div>
            
            <div className="voke-form-group-block">
              <label className="voke-form-label">Contraseña</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Introduce tu contraseña." className="voke-form-input-text" required />
            </div>

            <div className="voke-consejos-box">
              <p className="voke-form-label">Consejos:</p>
              <p className="voke-consejos-desc">Le sugerimos que no incluya datos personales, así como sus contraseñas más recientes utilizadas aquí en Voke o en otros sitios web.</p>
              <ul className="voke-consejos-list">
                <li>• Mínimo de 8 caracteres</li>
                <li>• Letras mayúsculas y minúsculas (A/a)</li>
                <li>• Al menos 1 número (148)</li>
                <li>• Caracteres especiales (@\$#)</li>
                <li>• No utilice secuencias (123/Abc)</li>
              </ul>
            </div>
            
            <div className="voke-form-group-block-spaced">
              <label className="voke-form-label">confirmar Contraseña</label>
              <input type="password" value={confPass} onChange={(e) => setConfPass(e.target.value)} placeholder="Introduzca la misma contraseña que arriba." className="voke-form-input-text" required />
            </div>

            <div className="voke-form-group-block">
              <label className="voke-form-label">Canales de notificación (opcional)</label>
              <p className="voke-notif-subtext">Selecciona los canales desde los que deseas recibir notificaciones de Voke.</p>
              <div className="voke-notif-list">
                <label className="voke-notif-label"><input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} /> correo electrónico</label>
                <label className="voke-notif-label"><input type="checkbox" checked={notifTel} onChange={(e) => setNotifTel(e.target.checked)} /> teléfono</label>
                <label className="voke-notif-label"><input type="checkbox" checked={notifWhatsapp} onChange={(e) => setNotifWhatsapp(e.target.checked)} /> WhatsApp</label>
                <label className="voke-notif-label"><input type="checkbox" checked={notifSms} onChange={(e) => setNotifSms(e.target.checked)} /> SMS</label>
              </div>
            </div>

            <div className="voke-buttons-flex">
              <button type="button" onClick={() => setFaseActual('acceso')} className="voke-btn-volver">Volver</button>
              <button type="submit" className="voke-btn-continuar">Continuar con el registro</button>
            </div>
          </form>
        )}
        {/* --- FASE 3: DADOS DO CLIENTE (PANEL CRUD POST-REGISTRO O LOGIN) --- */}
        {faseActual === 'perfil' && user && (
          <div className="voke-perfil-container">
            {/* 🚀 BOTÓN NUEVO: Permite regresar al catálogo de productos inmediatamente sin deslogar */}
            <div className="voke-profile-return-wrapper">
              <button 
                type="button" 
                onClick={() => navigate('/')} 
                className="voke-submit-btn-black voke-btn-return-full"
              >
                Voltar para a Loja (Ver Produtos)
              </button>
            </div>  

            
            {/* SECCIÓN 1: MODIFICAR DATOS BÁSICOS (PUT DATOS) */}
            <form onSubmit={modificarDatosBasicos} className="voke-profile-section-form">
              <div className="voke-form-title-block">
                <h3 className="voke-form-title-text-profile">Dados do Cliente</h3>
                <p className="voke-form-subtitle-text">Modifique sus datos de registro aquí.</p>
              </div>
              
              <div className="voke-form-group-block">
                <label className="voke-form-label">Nome Completo</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="voke-form-input-text" />
              </div>
              
              <div className="voke-form-group-block">
                <label className="voke-form-label">Correo electrónico</label>
                <input type="email" value={email} className="voke-form-input-text" disabled />
              </div>
              
              <div className="voke-form-group-block">
                <label className="voke-form-label">Telefone</label>
                <input type="text" value={tel} onChange={(e) => setTel(e.target.value)} className="voke-form-input-text" />
              </div>

              <button type="submit" className="voke-btn-salvar-datos">
                Salvar Alterações (PUT Datos)
              </button>
            </form>

            {/* SECCIÓN 2: MODIFICAR EXCLUSIVAMENTE LA CLAVE (PUT CLAVE) */}
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

            {/* SECCIÓN 3: ELIMINAR CUENTA (DELETE) Y CERRAR SESIÓN */}
            <div className="voke-profile-delete-zone">

              <p className="voke-delete-warning-text">¿Deseja cerrar su cuenta permanentemente?</p>
               <button type="button" onClick={eliminar} className="voke-btn-eliminar">
                Excluir Conta (DELETE)
              </button>

              {/* MIGRACIÓN DE ESTILOS: Se remueven los estilos en línea y se añade voke-btn-logout-full */}
                           {/* CORRECCIÓN DE FLUJO SEGURO: Limpieza sin conflictos de alcance de variables */}
              <button 
                type="button" 
                onClick={() => { 
                  localStorage.clear(); 
                  
                  // Evaluamos de forma segura si la función modificadora existe localmente antes de invocarla
                  if (typeof setUser === 'function') {
                    setUser(null);
                  }
                  
                  // Despachamos el evento global nativo para notificar al Navbar y al Carrito
                  window.dispatchEvent(new Event('carrito_actualizado'));
                  
                  setFaseActual('acceso'); 
                  navigate('/');
                }} 
                className="voke-btn-volver voke-btn-logout-full"
              >
                Sair da Conta (Logout)
              </button>

              {/* <button 
                type="button" 
                onClick={() => { 
                  localStorage.clear(); 
                  setUser(null); 
                  window.dispatchEvent(new Event('carrito_actualizado'));
                  setFaseActual('acceso'); 
                  navigate('/');
                }} 
                className="voke-btn-volver voke-btn-logout-full"
              >
                Sair da Conta (Logout)
              </button> */}
            </div>

          </div>
        )}

      </div>
    
  );
};

export default Login;