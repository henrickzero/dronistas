-- Seed de simulação: 80 propostas para Raissa Santos, endereços reais do Brasil
WITH perfil AS (
    SELECT ps.id AS solicitante_id
    FROM perfil_solicitante ps
    JOIN usuario u ON u.id = ps.usuario_id
    WHERE lower(u.nome) = 'raissa santos' AND u.ativo AND ps.ativo
    LIMIT 1
)
INSERT INTO proposta_voo (id, solicitante_id, titulo, descricao, local, data_voo, hora_voo,
                          duracao_min, qualidade_video, fps, formato_video, valor_oferecido,
                          estado, cidade, bairro, numero, cep, lat, lng,
                          solicitante_presente, status, criado_em)
SELECT
    gen_random_uuid(),
    perfil.solicitante_id,
    (ARRAY[
        'Filmagem aérea de evento em ',
        'Vídeo de imóvel em ',
        'Captura aérea para aniversário em ',
        'Cobertura aérea de casamento em ',
        'Inspeção de telhado em ',
        'Vídeo promocional de comércio em ',
        'Registro aéreo de obra em ',
        'Passeio de drone filmado em '
    ])[1 + (i % 8)] || loc.bai || ' — ' || loc.cid,
    'Roteiro: capturar plano geral e detalhes. ' || loc.ref || '. Entrega em MP4; LOG sob consulta.',
    loc.ref,
    (CURRENT_DATE + ((i % 87) + 3)),
    (ARRAY['08:00','09:30','11:00','14:00','15:30','17:00','18:30'])[1 + (i % 7)]::time,
    (ARRAY[20,30,45,60,75,90,120,150])[1 + (i % 8)],
    (ARRAY['FULLHD','2K','4K_30FPS','4K_60FPS','4K_120FPS'])[1 + (i % 5)],
    CASE WHEN (ARRAY['FULLHD','2K','4K_30FPS','4K_60FPS','4K_120FPS'])[1 + (i % 5)] IN ('FULLHD','2K')
         THEN (ARRAY[30,60])[1 + (i % 2)] ELSE NULL END,
    (ARRAY['MP4','MP4','MOV','LOG','RAW','PRORES'])[1 + (i % 6)],
    (150 + ((i * 97) % 2450))::numeric(12,2),
    loc.uf, loc.cid, loc.bai,
    (ARRAY['123','SN','456A','88','1200','67B','302'])[1 + (i % 7)],
    loc.cep, loc.lat, loc.lng,
    (i % 3) <> 0,
    'ABERTA',
    now() - (i * '7 hours'::interval)
FROM generate_series(1, 80) AS i
CROSS JOIN LATERAL (
    SELECT * FROM (VALUES
        ('PB','JOAO PESSOA','ALTIPLANO CABO BRANCO','58046-135',-7.1295,-34.8306,'Edificio next towers'),
        ('PB','JOAO PESSOA','TAMBAU','58039-000',-7.1167,-34.8139,'Orla de Tambaú, em frente ao quiosque 12'),
        ('PB','JOAO PESSOA','BESSA','58036-730',-7.0645,-34.8349,'Condominio Villas do Bessa'),
        ('PB','JOAO PESSOA','PRAIA DO SEIXAS','58045-490',-7.1625,-34.8106,'Praia do Seixas, entrada principal'),
        ('PB','CAMPINA GRANDE','CENTRO','58400-215',-7.2211,-35.8841,'Areeiro de Campina, esquina com a avenida'),
        ('PE','RECIFE','BOA VIAGEM','51030-000',-8.1280,-34.9143,'Edificio Ondas do Mar, 3o andar'),
        ('PE','RECIFE','CASA FORTE','52060-400',-8.0277,-34.9058,'Praca de Casa Forte'),
        ('PE','OLINDA','SITIO HISTORICO','53020-190',-7.9998,-34.8567,'Alto da Se'),
        ('PE','CARUARU','CENTRO','55012-000',-8.2837,-35.9811,'Feira de Caruaru, setor 3'),
        ('RN','NATAL','PONTA NEGRA','59090-060',-5.8781,-35.1836,'Morro do Careca, acesso norte'),
        ('RN','NATAL','CAPIM MACIO','59063-000',-5.8498,-35.1978,'Parque das Dunas, portaria B'),
        ('CE','FORTALEZA','MEIRELES','60115-000',-3.7200,-38.5107,'Beira-mar de Meireles, na altura do Dragao do Mar'),
        ('CE','FORTALEZA','PRAIA DO FUTURO','60182-310',-3.7300,-38.4700,'Barraca Chico do Caranguejo'),
        ('BA','SALVADOR','BARRA','40140-650',-13.0101,-38.5329,'Farol da Barra, praca'),
        ('BA','SALVADOR','PITUBA','41830-000',-13.0000,-38.4677,'Shopping Piedade, estacionamento'),
        ('RJ','RIO DE JANEIRO','COPACABANA','22071-000',-22.9711,-43.1822,'Avenida Atlantica, 1500'),
        ('RJ','RIO DE JANEIRO','BARRA DA TIJUCA','22793-370',-23.0011,-43.2950,'Jeune Savoir, torre B'),
        ('RJ','RIO DE JANEIRO','TIJUCA','20520-050',-22.9264,-43.2349,'Praca Saenz Pena'),
        ('SP','SAO PAULO','VILA MARIANA','04101-000',-23.5877,-46.6365,'Parque Ibirapuera, portao 8'),
        ('SP','SAO PAULO','PINHEIROS','05423-150',-23.5645,-46.6838,'Edificio Pinheiros Corporate'),
        ('SP','CAMPINAS','CAMBUI','13024-460',-22.9056,-46.6522,'Praca do Cambui'),
        ('MG','BELO HORIZONTE','SAVASSI','30140-050',-19.9333,-43.9333,'Praca da Savassi'),
        ('MG','BELO HORIZONTE','PAMPULHA','31365-000',-19.8622,-43.9842,'Mineirao, portao norte'),
        ('PR','CURITIBA','BATEL','80420-000',-25.4406,-49.2789,'Shopping Curitiba, acesso sul'),
        ('DF','BRASILIA','ASA SUL','70390-070',-15.7944,-47.8866,'Pontao do Lago Sul'),
        ('SC','FLORIANOPOLIS','CANASVIEIRAS','88052-000',-27.4242,-48.4569,'Beira-mar de Canasvieiras'),
        ('RS','PORTO ALEGRE','MOINHOS DE VENTO','90570-070',-30.0611,-51.1851,'Parca Moinhos, quadra 4'),
        ('AM','MANAUS','ADRIANOPOLIS','69057-010',-3.1170,-60.0222,'Manauara Shopping, estacionamento B'),
        ('GO','GOIANIA','SETOR OESTE','74115-000',-16.6866,-49.2607,'Praca T-23'),
        ('PA','BELEM','NAZARE','66035-170',-1.4454,-48.5006,'Praca Batista Campos')
    ) AS x(uf, cid, bai, cep, lat, lng, ref)
    ORDER BY x.cep
    OFFSET ((i - 1) % 30)
    LIMIT 1
) AS loc
CROSS JOIN perfil;
