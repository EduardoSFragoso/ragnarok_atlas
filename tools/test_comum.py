"""Testes das tabelas lidas pelo contrato data/colunas.json (tools/_comum.py).

Rodar: python3 -m unittest discover -s tools -p "test_*.py"   (no Windows: py -m unittest ...)
"""

import json
import shutil
import tempfile
import unittest
from pathlib import Path

import _comum
import agregar_efeitos
import baixar_icones
import puxar_efeitos_divine_pride

RAIZ_REAL = Path(__file__).resolve().parent.parent


class ProjetoTemporario:
    """Copia data/ para uma pasta temporária e aponta as ferramentas para ela."""

    def __enter__(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="atlas-"))
        shutil.copytree(RAIZ_REAL / "data", self.tmp / "data")
        self.antigos = (_comum.RAIZ, baixar_icones.ROOT, puxar_efeitos_divine_pride.ROOT)
        _comum.RAIZ = baixar_icones.ROOT = puxar_efeitos_divine_pride.ROOT = self.tmp
        return self

    def __exit__(self, *_):
        _comum.RAIZ, baixar_icones.ROOT, puxar_efeitos_divine_pride.ROOT = self.antigos
        shutil.rmtree(self.tmp, ignore_errors=True)

    def ler(self, nome):
        return json.loads((self.tmp / "data" / nome).read_text(encoding="utf-8"))

    def gravar(self, nome, dados):
        (self.tmp / "data" / nome).write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")


class TestRegistros(unittest.TestCase):
    def test_todas_as_tabelas_do_contrato_carregam_com_todos_os_campos(self):
        contrato = _comum.carregar_contrato()
        self.assertGreater(len(contrato), 0)
        for tabela, definicao in contrato.items():
            with self.subTest(tabela=tabela):
                linhas = _comum.registros(tabela)
                bruto = json.loads((RAIZ_REAL / "data" / definicao["arquivo"]).read_text(encoding="utf-8"))
                self.assertEqual(len(linhas), len(bruto))
                for r in linhas:
                    self.assertEqual(set(r), set(definicao["campos"]))
                    self.assertTrue(all(isinstance(v, str) for v in r.values()))

    def test_ordem_das_colunas_nos_jsons_nao_importa(self):
        esperado = _comum.registros("custo")
        with ProjetoTemporario() as p:
            dados = p.ler("custo_de_encantamento.json")
            p.gravar("custo_de_encantamento.json", [dict(reversed(list(r.items()))) for r in dados])
            self.assertEqual(_comum.registros("custo"), esperado)

    def test_coluna_extra_e_ignorada(self):
        esperado = _comum.registros("encantos")
        with ProjetoTemporario() as p:
            dados = p.ler("encantamentos_disponiveis.json")
            for r in dados:
                r["coluna nova"] = "x"
            p.gravar("encantamentos_disponiveis.json", dados)
            self.assertEqual(_comum.registros("encantos"), esperado)

    def test_coluna_do_contrato_ausente_levanta_erro_claro(self):
        with ProjetoTemporario() as p:
            dados = p.ler("custo_de_encantamento.json")
            for r in dados:
                del r["Material"]
            p.gravar("custo_de_encantamento.json", dados)
            with self.assertRaisesRegex(ValueError, "Material"):
                _comum.registros("custo")

    def test_tabela_inexistente_levanta_keyerror(self):
        with self.assertRaises(KeyError):
            _comum.registros("nao_existe")


class TestFerramentas(unittest.TestCase):
    def test_agregar_efeitos_usa_o_contrato(self):
        self.assertEqual(agregar_efeitos.COLUNA, "Efeito (+11)")
        self.assertEqual(agregar_efeitos.PLANILHA.name, "encantamentos_disponiveis.json")

    def test_coletar_considera_o_primeiro_registro_de_cada_tabela(self):
        # Antes, linhas_json()[1:] descartava o 1º registro (resto do tempo das planilhas TSV).
        with ProjetoTemporario() as p:
            custo = p.ler("custo_de_encantamento.json")
            custo[0]["Material"] = "Item Teste Primeiro Registro"
            p.gravar("custo_de_encantamento.json", custo)
            _, sem_id = baixar_icones.coletar()
            self.assertIn("Item Teste Primeiro Registro", sem_id)

    def test_pendentes_considera_o_primeiro_registro(self):
        with ProjetoTemporario() as p:
            enc = p.ler("encantamentos_disponiveis.json")
            enc[0].update({"Episódio": "Ep. 18", "Encantamento": "Encanto Teste", "Efeito (+11)": "não informado"})
            p.gravar("encantamentos_disponiveis.json", enc)
            self.assertIn("Encanto Teste", puxar_efeitos_divine_pride.pendentes())

    def test_resultado_estavel_com_colunas_embaralhadas(self):
        ids_antes, sem_antes = baixar_icones.coletar()
        pend_antes = puxar_efeitos_divine_pride.pendentes()
        with ProjetoTemporario() as p:
            for arquivo in (d["arquivo"] for d in _comum.carregar_contrato().values()):
                dados = p.ler(arquivo)
                p.gravar(arquivo, [dict(reversed(list(r.items()))) for r in dados])
            self.assertEqual(baixar_icones.coletar(), (ids_antes, sem_antes))
            self.assertEqual(puxar_efeitos_divine_pride.pendentes(), pend_antes)


if __name__ == "__main__":
    unittest.main()
